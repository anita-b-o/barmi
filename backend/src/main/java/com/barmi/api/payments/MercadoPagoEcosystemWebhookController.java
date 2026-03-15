package com.barmi.api.payments;

import com.barmi.app.payments.EcosystemPaymentConfirmationService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.UUID;

import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.UNAUTHORIZED;

@RestController
@RequestMapping("/api/payments/mercadopago/ecosystem")
public class MercadoPagoEcosystemWebhookController {

    private final String secret;
    private final EcosystemPaymentConfirmationService ecosystemPaymentConfirmationService;

    public MercadoPagoEcosystemWebhookController(
            @Value("${app.mercadoPago.webhookSecret}") String secret,
            EcosystemPaymentConfirmationService ecosystemPaymentConfirmationService
    ) {
        this.secret = secret;
        this.ecosystemPaymentConfirmationService = ecosystemPaymentConfirmationService;
    }

    @PostMapping("/webhook")
    public ResponseEntity<?> receive(
            @RequestHeader(value = "X-Barmi-Webhook-Secret", required = false) String headerSecret,
            @RequestBody Map<String, Object> payload
    ) {
        if (headerSecret == null || !headerSecret.equals(secret)) {
            throw new ResponseStatusException(UNAUTHORIZED, "invalid_secret");
        }

        String status = stringOrNull(payload.get("status"));
        if (status != null && !status.isBlank() && !"approved".equalsIgnoreCase(status)) {
            return ResponseEntity.ok(Map.of("status", "ignored"));
        }

        UUID webhookEventId = resolveWebhookEventId(payload);
        UUID ecosystemOrderId = resolveEcosystemOrderId(payload);
        String providerPaymentId = resolveProviderPaymentId(payload);

        BigDecimal amount = resolveAmount(payload);
        String currency = resolveCurrency(payload);

        ecosystemPaymentConfirmationService.confirmEcosystemPayment(
                webhookEventId,
                ecosystemOrderId,
                providerPaymentId,
                amount,
                currency
        );

        return ResponseEntity.ok(Map.of("ok", true));
    }

    private UUID resolveWebhookEventId(Map<String, Object> payload) {
        Object raw = payload.get("eventId");
        if (raw == null) raw = payload.get("event_id");
        if (raw == null) raw = payload.get("id");
        if (raw == null || raw.toString().isBlank()) {
            throw new ResponseStatusException(BAD_REQUEST, "missing_event_id");
        }
        String value = raw.toString();
        try {
            return UUID.fromString(value);
        } catch (IllegalArgumentException ex) {
            return UUID.nameUUIDFromBytes(("MERCADOPAGO_EVENT:" + value).getBytes(StandardCharsets.UTF_8));
        }
    }

    private UUID resolveEcosystemOrderId(Map<String, Object> payload) {
        Object raw = payload.get("ecosystemOrderId");
        if (raw == null) raw = payload.get("operation_id");
        if (raw == null) {
            Object metadata = payload.get("metadata");
            if (metadata instanceof Map<?, ?> metaMap) {
                Object fromMeta = metaMap.get("ecosystemOrderId");
                if (fromMeta != null) raw = fromMeta;
            }
        }
        if (raw == null || raw.toString().isBlank()) {
            throw new ResponseStatusException(BAD_REQUEST, "missing_ecosystem_order_id");
        }
        try {
            return UUID.fromString(raw.toString());
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(BAD_REQUEST, "invalid_ecosystem_order_id");
        }
    }

    private String resolveProviderPaymentId(Map<String, Object> payload) {
        Object raw = payload.get("providerPaymentId");
        if (raw == null) raw = payload.get("provider_payment_id");
        if (raw == null) raw = payload.get("payment_id");
        if (raw == null) {
            Object data = payload.get("data");
            if (data instanceof Map<?, ?> dataMap) {
                Object id = dataMap.get("id");
                if (id != null) raw = id;
            }
        }
        if (raw == null || raw.toString().isBlank()) {
            throw new ResponseStatusException(BAD_REQUEST, "missing_provider_payment_id");
        }
        return raw.toString();
    }

    private BigDecimal resolveAmount(Map<String, Object> payload) {
        Object raw = payload.get("amount");
        if (raw == null) raw = payload.get("transaction_amount");
        if (raw == null) {
            Object data = payload.get("data");
            if (data instanceof Map<?, ?> dataMap) {
                Object amount = dataMap.get("amount");
                if (amount != null) raw = amount;
            }
        }
        if (raw == null) {
            throw new ResponseStatusException(BAD_REQUEST, "missing_amount");
        }
        try {
            return new BigDecimal(raw.toString()).setScale(2, RoundingMode.HALF_UP);
        } catch (NumberFormatException ex) {
            throw new ResponseStatusException(BAD_REQUEST, "invalid_amount");
        }
    }

    private String resolveCurrency(Map<String, Object> payload) {
        Object raw = payload.get("currency");
        if (raw == null) raw = payload.get("currency_id");
        if (raw == null || raw.toString().isBlank()) {
            throw new ResponseStatusException(BAD_REQUEST, "missing_currency");
        }
        return raw.toString().trim().toUpperCase();
    }

    private String stringOrNull(Object value) {
        return value == null ? null : value.toString();
    }
}
