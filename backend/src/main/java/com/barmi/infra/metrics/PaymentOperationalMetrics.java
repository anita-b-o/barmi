package com.barmi.infra.metrics;

import com.barmi.domain.enums.PaymentScope;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Locale;

@Component
public class PaymentOperationalMetrics {
    public static final String PROVIDER_MERCADO_PAGO = "mercado_pago";

    private final MeterRegistry meterRegistry;

    public PaymentOperationalMetrics(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
    }

    public void recordPaymentInitiation(PaymentScope scope, String provider, String result) {
        meterRegistry.counter(
                "barmi_payment_initiation_total",
                "scope", scope == null ? "UNKNOWN" : scope.name(),
                "provider", normalizeProvider(provider),
                "result", normalizeResult(result)
        ).increment();
    }

    public void recordPaymentProviderRequest(String operation, String result) {
        meterRegistry.counter(
                "barmi_payment_provider_requests_total",
                "provider", PROVIDER_MERCADO_PAGO,
                "operation", normalizeOperation(operation),
                "result", normalizeResult(result)
        ).increment();
    }

    public void recordPaymentProviderLatency(String operation, long durationNanos) {
        Timer.builder("barmi_payment_provider_latency_seconds")
                .tag("provider", PROVIDER_MERCADO_PAGO)
                .tag("operation", normalizeOperation(operation))
                .publishPercentileHistogram()
                .register(meterRegistry)
                .record(Duration.ofNanos(Math.max(0L, durationNanos)));
    }

    public void recordWebhook(String provider, String scope, String result, String reason) {
        meterRegistry.counter(
                "barmi_webhooks_received_total",
                "provider", normalizeProvider(provider),
                "scope", normalizeWebhookScope(scope),
                "result", normalizeWebhookResult(result),
                "reason", normalizeWebhookReason(reason)
        ).increment();
    }

    String normalizeProvider(String value) {
        if (value == null || value.isBlank()) {
            return "unknown";
        }
        String normalized = value.trim().toLowerCase(Locale.ROOT).replace("-", "_");
        if (normalized.equals("mercadopago")
                || normalized.equals("mercado_pago")
                || normalized.equals("mercadopago_store")
                || normalized.equals("mercadopago_ecosystem")) {
            return PROVIDER_MERCADO_PAGO;
        }
        return "unknown";
    }

    private String normalizeResult(String value) {
        return "success".equalsIgnoreCase(value) ? "success" : "failure";
    }

    private String normalizeOperation(String value) {
        if ("get_payment".equals(value) || "create_preference".equals(value) || "merchant_order".equals(value)) {
            return value;
        }
        return "unknown";
    }

    private String normalizeWebhookScope(String value) {
        if ("store".equalsIgnoreCase(value)) {
            return "store";
        }
        if ("ecosystem".equalsIgnoreCase(value)) {
            return "ecosystem";
        }
        return "unknown";
    }

    private String normalizeWebhookResult(String value) {
        if ("accepted".equalsIgnoreCase(value)) {
            return "accepted";
        }
        if ("rejected".equalsIgnoreCase(value)) {
            return "rejected";
        }
        if ("ignored".equalsIgnoreCase(value)) {
            return "ignored";
        }
        return "failure";
    }

    private String normalizeWebhookReason(String value) {
        if (value == null || value.isBlank()) {
            return "unknown";
        }
        return switch (value.trim().toLowerCase(Locale.ROOT)) {
            case "processed", "unsupported", "signature_invalid", "replay", "duplicate",
                    "order_not_found", "mismatch", "payload_invalid", "timeout",
                    "provider_unavailable", "unknown" -> value.trim().toLowerCase(Locale.ROOT);
            default -> "unknown";
        };
    }
}
