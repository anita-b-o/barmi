package com.barmi.api.webhooks;

import com.barmi.app.config.ObservabilitySupport;
import com.barmi.app.payments.StorePaymentConfirmationService;
import com.barmi.infra.metrics.PaymentOperationalMetrics;
import com.barmi.infra.payments.MercadoPagoApiClient;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
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
    private static final Logger log = LoggerFactory.getLogger(MercadoPagoWebhookController.class);
    private static final String PROVIDER = "mercadopago_store";
    private static final String SCOPE = "store";

    private final StorePaymentConfirmationService storePaymentConfirmationService;
    private final MercadoPagoWebhookSecurityService webhookSecurityService;
    private final MercadoPagoApiClient mercadoPagoApiClient;
    private final PaymentOperationalMetrics paymentOperationalMetrics;

    public MercadoPagoWebhookController(
            StorePaymentConfirmationService storePaymentConfirmationService,
            MercadoPagoWebhookSecurityService webhookSecurityService,
            MercadoPagoApiClient mercadoPagoApiClient,
            PaymentOperationalMetrics paymentOperationalMetrics
    ) {
        this.storePaymentConfirmationService = storePaymentConfirmationService;
        this.webhookSecurityService = webhookSecurityService;
        this.mercadoPagoApiClient = mercadoPagoApiClient;
        this.paymentOperationalMetrics = paymentOperationalMetrics;
    }

    @PostMapping
    public ResponseEntity<?> receive(
            @RequestHeader(value = "X-Barmi-Webhook-Secret", required = false) String headerSecret,
            @RequestHeader(value = MercadoPagoWebhookSecurityService.TIMESTAMP_HEADER, required = false) String timestampHeader,
            @RequestHeader(value = MercadoPagoWebhookSecurityService.SIGNATURE_HEADER, required = false) String signatureHeader,
            @RequestHeader(value = MercadoPagoWebhookSecurityService.REQUEST_ID_HEADER, required = false) String requestIdHeader,
            @RequestBody(required = false) MercadoPagoStoreWebhookRequest payload,
            @RequestParam(value = "data.id", required = false) String dataId,
            HttpServletRequest request
    ) {
        if (payload == null) {
            webhookSecurityService.logPayloadError(PROVIDER, null, request, "missing_payload");
            throw new ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "missing_payload");
        }
        if ("payment".equalsIgnoreCase(payload.type()) && payload.data() != null && payload.data().id() != null) {
            return receiveProviderWebhook(signatureHeader, requestIdHeader, payload, dataId, request);
        }
        if (payload.eventId() == null || payload.eventId().isBlank()) {
            webhookSecurityService.logPayloadError(PROVIDER, null, request, "missing_event_id");
            throw new ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "missing_event_id");
        }
        if (payload.status() == null || payload.status().isBlank()) {
            webhookSecurityService.logPayloadError(PROVIDER, payload.eventId(), request, "missing_status");
            throw new ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "missing_status");
        }
        webhookSecurityService.validate(PROVIDER, headerSecret, timestampHeader, payload.eventId(), request);
        if (!"approved".equalsIgnoreCase(payload.status())) {
            paymentOperationalMetrics.recordWebhook(PROVIDER, SCOPE, "ignored", "unsupported");
            return ResponseEntity.ok(java.util.Map.of("status", "ignored"));
        }
        if (payload.operationId() == null || payload.operationId().isBlank()) {
            webhookSecurityService.logPayloadError(PROVIDER, payload.eventId(), request, "missing_operation_id");
            throw new ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "missing_operation_id");
        }
        if (payload.providerPaymentId() == null || payload.providerPaymentId().isBlank()) {
            webhookSecurityService.logPayloadError(PROVIDER, payload.eventId(), request, "missing_provider_payment_id");
            throw new ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "missing_provider_payment_id");
        }
        if (payload.amount() == null) {
            webhookSecurityService.logPayloadError(PROVIDER, payload.eventId(), request, "missing_amount");
            throw new ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "missing_amount");
        }
        if (payload.currency() == null || payload.currency().isBlank()) {
            webhookSecurityService.logPayloadError(PROVIDER, payload.eventId(), request, "missing_currency");
            throw new ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "missing_currency");
        }

        UUID eventId = parseUuid(payload.eventId(), "invalid_event_id");
        UUID operationId = parseUuid(payload.operationId(), "invalid_operation_id");
        String providerPaymentId = payload.providerPaymentId().trim();
        BigDecimal amount = payload.amount();
        String currency = payload.currency().trim().toUpperCase();

        try {
            storePaymentConfirmationService.confirmStorePayment(
                    eventId,
                    operationId,
                    providerPaymentId,
                    amount,
                    currency
            );
        } catch (RuntimeException ex) {
            paymentOperationalMetrics.recordWebhook(PROVIDER, SCOPE, "failure", reasonForFailure(ex));
            throw ex;
        }

        paymentOperationalMetrics.recordWebhook(PROVIDER, SCOPE, "accepted", "processed");
        log.info("webhook_accepted provider={} event_id={} operation_id={} request_id={} retry_count={} event_type={} provider_payment_id={}",
                PROVIDER,
                payload.eventId(),
                payload.operationId(),
                ObservabilitySupport.requestId(request),
                ObservabilitySupport.retryCount(request),
                payload.status(),
                providerPaymentId);
        return ResponseEntity.ok(java.util.Map.of("status", "accepted"));
    }

    private ResponseEntity<?> receiveProviderWebhook(
            String signatureHeader,
            String requestIdHeader,
            MercadoPagoStoreWebhookRequest payload,
            String dataIdQueryParam,
            HttpServletRequest request
    ) {
        String paymentId = firstNonBlank(dataIdQueryParam, payload.data() == null ? null : payload.data().id());
        if (paymentId == null || paymentId.isBlank()) {
            webhookSecurityService.logPayloadError(PROVIDER, null, request, "missing_provider_payment_id");
            throw new ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "missing_provider_payment_id");
        }

        webhookSecurityService.validateMercadoPagoSignature(PROVIDER, signatureHeader, requestIdHeader, paymentId, payload.eventId(), request);
        try {
            MercadoPagoApiClient.PaymentDetails payment = mercadoPagoApiClient.getPayment(paymentId);
            if (!"approved".equalsIgnoreCase(payment.status())) {
                paymentOperationalMetrics.recordWebhook(PROVIDER, SCOPE, "ignored", "unsupported");
                return ResponseEntity.ok(java.util.Map.of("status", "ignored"));
            }

            UUID orderId = parseExternalReference(payment.externalReference(), "STORE");
            storePaymentConfirmationService.confirmStorePayment(
                    java.util.UUID.nameUUIDFromBytes(("MERCADOPAGO:" + paymentId).getBytes(java.nio.charset.StandardCharsets.UTF_8)),
                    orderId,
                    payment.id(),
                    payment.transactionAmount(),
                    payment.currencyId()
            );

            paymentOperationalMetrics.recordWebhook(PROVIDER, SCOPE, "accepted", "processed");
            log.info("webhook_accepted provider={} event_id={} operation_id={} request_id={} retry_count={} event_type={} provider_payment_id={}",
                    PROVIDER,
                    paymentId,
                    orderId,
                    ObservabilitySupport.requestId(request),
                    ObservabilitySupport.retryCount(request),
                    firstNonBlank(payload.action(), payload.type(), payment.status()),
                    payment.id());
            return ResponseEntity.ok(java.util.Map.of("status", "accepted"));
        } catch (RuntimeException ex) {
            paymentOperationalMetrics.recordWebhook(PROVIDER, SCOPE, "failure", reasonForFailure(ex));
            throw ex;
        }
    }

    private UUID parseUuid(String value, String errorCode) {
        try {
            return UUID.fromString(value);
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, errorCode);
        }
    }

    private UUID parseExternalReference(String externalReference, String expectedScope) {
        if (externalReference == null || externalReference.isBlank()) {
            throw new ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "missing_operation_id");
        }
        String[] parts = externalReference.split(":", 2);
        if (parts.length != 2 || !expectedScope.equalsIgnoreCase(parts[0])) {
            throw new ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "invalid_operation_id");
        }
        return parseUuid(parts[1], "invalid_operation_id");
    }

    private String firstNonBlank(String... values) {
        if (values == null) {
            return null;
        }
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return null;
    }

    private String reasonForFailure(RuntimeException ex) {
        if (ex instanceof ResponseStatusException responseStatusException) {
            String reason = responseStatusException.getReason();
            if (reason == null) {
                return "unknown";
            }
            if (reason.contains("provider")) {
                return "provider_unavailable";
            }
            if (reason.contains("mismatch")) {
                return "mismatch";
            }
            if (reason.contains("not_found")) {
                return "order_not_found";
            }
        }
        return "unknown";
    }
}
