package com.barmi.api.webhooks;

import com.barmi.app.payments.StorePaymentConfirmationService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;

/**
 * MVP webhook endpoint:
 * - validates a shared secret header (simple)
 * - enforces idempotency by event_id
 * - writes a domain event into outbox for async processing
 *
 * Replace this with real MP signature validation as you productize.
 */
@RestController
@RequestMapping("/api/webhooks/mercadopago")
public class MercadoPagoWebhookController {

    private final String secret;
    private final StorePaymentConfirmationService storePaymentConfirmationService;

    public MercadoPagoWebhookController(
            @Value("${app.mercadoPago.webhookSecret}") String secret,
            StorePaymentConfirmationService storePaymentConfirmationService
    ) {
        this.secret = secret;
        this.storePaymentConfirmationService = storePaymentConfirmationService;
    }

    @PostMapping
    public ResponseEntity<?> receive(
            @RequestHeader(value = "X-Barmi-Webhook-Secret", required = false) String headerSecret,
            @RequestBody Map<String, Object> payload
    ) {
        if (headerSecret == null || !headerSecret.equals(secret)) {
            throw new ResponseStatusException(org.springframework.http.HttpStatus.UNAUTHORIZED, "invalid_secret");
        }

        Object eventIdRaw = payload.get("event_id");
        if (eventIdRaw == null) {
            throw new ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "missing_event_id");
        }

        Object statusRaw = payload.get("status");
        if (statusRaw == null) {
            throw new ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "missing_status");
        }

        if (!"approved".equalsIgnoreCase(statusRaw.toString())) {
            return ResponseEntity.ok(Map.of("status", "ignored"));
        }

        Object operationIdRaw = payload.get("operation_id");
        if (operationIdRaw == null) {
            throw new ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "missing_operation_id");
        }

        Object providerPaymentIdRaw = payload.get("provider_payment_id");
        if (providerPaymentIdRaw == null) {
            throw new ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "missing_provider_payment_id");
        }

        Object amountRaw = payload.get("amount");
        if (amountRaw == null) {
            throw new ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "missing_amount");
        }

        Object currencyRaw = payload.get("currency");
        if (currencyRaw == null) {
            throw new ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "missing_currency");
        }

        UUID eventId = UUID.fromString(eventIdRaw.toString());
        UUID operationId = UUID.fromString(operationIdRaw.toString());
        String providerPaymentId = providerPaymentIdRaw.toString();
        BigDecimal amount = new BigDecimal(amountRaw.toString());
        String currency = currencyRaw.toString();

        storePaymentConfirmationService.confirmStorePayment(
                eventId,
                operationId,
                providerPaymentId,
                amount,
                currency
        );

        return ResponseEntity.ok(Map.of("status", "accepted"));
    }
}
