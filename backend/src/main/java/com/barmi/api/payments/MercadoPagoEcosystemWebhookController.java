package com.barmi.api.payments;

import com.barmi.api.webhooks.MercadoPagoEcosystemWebhookRequest;
import com.barmi.api.webhooks.MercadoPagoWebhookSecurityService;
import com.barmi.app.config.ObservabilitySupport;
import com.barmi.app.payments.EcosystemPaymentConfirmationService;
import com.barmi.infra.metrics.PaymentOperationalMetrics;
import com.barmi.infra.payments.MercadoPagoApiClient;
import jakarta.servlet.http.HttpServletRequest;
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
    private static final String PROVIDER = "mercadopago_ecosystem";
    private static final String SCOPE = "ecosystem";

    private final EcosystemPaymentConfirmationService ecosystemPaymentConfirmationService;
    private final MercadoPagoWebhookSecurityService webhookSecurityService;
    private final MercadoPagoApiClient mercadoPagoApiClient;
    private final PaymentOperationalMetrics paymentOperationalMetrics;

    public MercadoPagoEcosystemWebhookController(
            EcosystemPaymentConfirmationService ecosystemPaymentConfirmationService,
            MercadoPagoWebhookSecurityService webhookSecurityService,
            MercadoPagoApiClient mercadoPagoApiClient,
            PaymentOperationalMetrics paymentOperationalMetrics
    ) {
        this.ecosystemPaymentConfirmationService = ecosystemPaymentConfirmationService;
        this.webhookSecurityService = webhookSecurityService;
        this.mercadoPagoApiClient = mercadoPagoApiClient;
        this.paymentOperationalMetrics = paymentOperationalMetrics;
    }

    @PostMapping("/webhook")
    public ResponseEntity<?> receive(
            @RequestHeader(value = "X-Barmi-Webhook-Secret", required = false) String headerSecret,
            @RequestHeader(value = MercadoPagoWebhookSecurityService.TIMESTAMP_HEADER, required = false) String timestampHeader,
            @RequestHeader(value = MercadoPagoWebhookSecurityService.SIGNATURE_HEADER, required = false) String signatureHeader,
            @RequestHeader(value = MercadoPagoWebhookSecurityService.REQUEST_ID_HEADER, required = false) String requestIdHeader,
            @RequestBody(required = false) MercadoPagoEcosystemWebhookRequest payload,
            @RequestParam(value = "data.id", required = false) String dataId,
            HttpServletRequest request
    ) {
        if (payload == null) {
            webhookSecurityService.logPayloadError(PROVIDER, null, request, "missing_payload");
            throw new ResponseStatusException(BAD_REQUEST, "missing_payload");
        }
        if ("payment".equalsIgnoreCase(payload.type()) && (payload.data() != null || dataId != null)) {
            return receiveProviderWebhook(signatureHeader, requestIdHeader, payload, dataId, request);
        }
        String rawEventId = resolveEventId(payload);
        webhookSecurityService.validate(PROVIDER, headerSecret, timestampHeader, rawEventId, request);

        String status = stringOrNull(payload.status());
        if (status != null && !status.isBlank() && !"approved".equalsIgnoreCase(status)) {
            paymentOperationalMetrics.recordWebhook(PROVIDER, SCOPE, "ignored", "unsupported");
            return ResponseEntity.ok(Map.of("status", "ignored"));
        }

        UUID webhookEventId = resolveWebhookEventId(payload);
        UUID ecosystemOrderId = resolveEcosystemOrderId(payload);
        String providerPaymentId = resolveProviderPaymentId(payload);

        BigDecimal amount = resolveAmount(payload);
        String currency = resolveCurrency(payload);

        try {
            ecosystemPaymentConfirmationService.confirmEcosystemPayment(
                    webhookEventId,
                    ecosystemOrderId,
                    providerPaymentId,
                    amount,
                    currency
            );
        } catch (RuntimeException ex) {
            paymentOperationalMetrics.recordWebhook(PROVIDER, SCOPE, "failure", reasonForFailure(ex));
            throw ex;
        }

        paymentOperationalMetrics.recordWebhook(PROVIDER, SCOPE, "accepted", "processed");
        org.slf4j.LoggerFactory.getLogger(MercadoPagoEcosystemWebhookController.class)
                .info("webhook_accepted provider={} event_id={} operation_id={} request_id={} retry_count={} event_type={} provider_payment_id={}",
                        PROVIDER,
                        rawEventId,
                        ecosystemOrderId,
                        ObservabilitySupport.requestId(request),
                        ObservabilitySupport.retryCount(request),
                        status,
                providerPaymentId);
        return ResponseEntity.ok(Map.of("ok", true));
    }

    private ResponseEntity<?> receiveProviderWebhook(
            String signatureHeader,
            String requestIdHeader,
            MercadoPagoEcosystemWebhookRequest payload,
            String dataIdQueryParam,
            HttpServletRequest request
    ) {
        String paymentId = firstNonBlank(dataIdQueryParam, payload.data() == null ? null : payload.data().id());
        if (paymentId == null || paymentId.isBlank()) {
            webhookSecurityService.logPayloadError(PROVIDER, null, request, "missing_provider_payment_id");
            throw new ResponseStatusException(BAD_REQUEST, "missing_provider_payment_id");
        }
        webhookSecurityService.validateMercadoPagoSignature(PROVIDER, signatureHeader, requestIdHeader, paymentId, payload.eventId(), request);

        try {
            MercadoPagoApiClient.PaymentDetails payment = mercadoPagoApiClient.getPayment(paymentId);
            if (!"approved".equalsIgnoreCase(payment.status())) {
                paymentOperationalMetrics.recordWebhook(PROVIDER, SCOPE, "ignored", "unsupported");
                return ResponseEntity.ok(Map.of("status", "ignored"));
            }

            UUID ecosystemOrderId = parseExternalReference(payment.externalReference(), "ECOSYSTEM");
            ecosystemPaymentConfirmationService.confirmEcosystemPayment(
                    UUID.nameUUIDFromBytes(("MERCADOPAGO:" + paymentId).getBytes(StandardCharsets.UTF_8)),
                    ecosystemOrderId,
                    payment.id(),
                    requireAmount(payment.transactionAmount()),
                    requireCurrency(payment.currencyId())
            );

            paymentOperationalMetrics.recordWebhook(PROVIDER, SCOPE, "accepted", "processed");
            org.slf4j.LoggerFactory.getLogger(MercadoPagoEcosystemWebhookController.class)
                    .info("webhook_accepted provider={} event_id={} operation_id={} request_id={} retry_count={} event_type={} provider_payment_id={}",
                            PROVIDER,
                            payload.eventId(),
                            ecosystemOrderId,
                            ObservabilitySupport.requestId(request),
                            ObservabilitySupport.retryCount(request),
                            firstNonBlank(payload.action(), payload.type(), payment.status()),
                            payment.id());
            return ResponseEntity.ok(Map.of("ok", true));
        } catch (RuntimeException ex) {
            paymentOperationalMetrics.recordWebhook(PROVIDER, SCOPE, "failure", reasonForFailure(ex));
            throw ex;
        }
    }

    private UUID resolveWebhookEventId(MercadoPagoEcosystemWebhookRequest payload) {
        String raw = resolveEventId(payload);
        if (raw == null || raw.isBlank()) {
            throw new ResponseStatusException(BAD_REQUEST, "missing_event_id");
        }
        try {
            return UUID.fromString(raw);
        } catch (IllegalArgumentException ex) {
            return UUID.nameUUIDFromBytes(("MERCADOPAGO_EVENT:" + raw).getBytes(StandardCharsets.UTF_8));
        }
    }

    private UUID resolveEcosystemOrderId(MercadoPagoEcosystemWebhookRequest payload) {
        String raw = firstNonBlank(
                payload.ecosystemOrderId(),
                payload.metadata() == null ? null : payload.metadata().ecosystemOrderId()
        );
        if (raw == null || raw.isBlank()) {
            throw new ResponseStatusException(BAD_REQUEST, "missing_ecosystem_order_id");
        }
        try {
            return UUID.fromString(raw);
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(BAD_REQUEST, "invalid_ecosystem_order_id");
        }
    }

    private String resolveProviderPaymentId(MercadoPagoEcosystemWebhookRequest payload) {
        String raw = firstNonBlank(
                payload.providerPaymentId(),
                payload.data() == null ? null : payload.data().id()
        );
        if (raw == null || raw.isBlank()) {
            throw new ResponseStatusException(BAD_REQUEST, "missing_provider_payment_id");
        }
        return raw;
    }

    private BigDecimal resolveAmount(MercadoPagoEcosystemWebhookRequest payload) {
        BigDecimal raw = payload.amount() != null
                ? payload.amount()
                : payload.transactionAmount() != null
                    ? payload.transactionAmount()
                    : payload.data() == null ? null : payload.data().amount();
        if (raw == null) {
            throw new ResponseStatusException(BAD_REQUEST, "missing_amount");
        }
        try {
            return raw.setScale(2, RoundingMode.HALF_UP);
        } catch (ArithmeticException ex) {
            throw new ResponseStatusException(BAD_REQUEST, "invalid_amount");
        }
    }

    private String resolveCurrency(MercadoPagoEcosystemWebhookRequest payload) {
        String raw = firstNonBlank(payload.currency(), payload.currencyId());
        if (raw == null || raw.isBlank()) {
            throw new ResponseStatusException(BAD_REQUEST, "missing_currency");
        }
        return raw.trim().toUpperCase();
    }

    private String resolveEventId(MercadoPagoEcosystemWebhookRequest payload) {
        return firstNonBlank(payload.eventId(), payload.providerPaymentId(), payload.data() == null ? null : payload.data().id());
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

    private String stringOrNull(String value) {
        return value == null ? null : value.toString();
    }

    private BigDecimal requireAmount(BigDecimal amount) {
        if (amount == null) {
            throw new ResponseStatusException(BAD_REQUEST, "missing_amount");
        }
        return amount.setScale(2, RoundingMode.HALF_UP);
    }

    private String requireCurrency(String currency) {
        if (currency == null || currency.isBlank()) {
            throw new ResponseStatusException(BAD_REQUEST, "missing_currency");
        }
        return currency.trim().toUpperCase();
    }

    private UUID parseExternalReference(String externalReference, String expectedScope) {
        if (externalReference == null || externalReference.isBlank()) {
            throw new ResponseStatusException(BAD_REQUEST, "missing_ecosystem_order_id");
        }
        String[] parts = externalReference.split(":", 2);
        if (parts.length != 2 || !expectedScope.equalsIgnoreCase(parts[0])) {
            throw new ResponseStatusException(BAD_REQUEST, "invalid_ecosystem_order_id");
        }
        try {
            return UUID.fromString(parts[1]);
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(BAD_REQUEST, "invalid_ecosystem_order_id");
        }
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
