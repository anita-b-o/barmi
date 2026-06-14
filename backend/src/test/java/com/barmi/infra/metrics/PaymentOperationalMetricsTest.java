package com.barmi.infra.metrics;

import com.barmi.domain.enums.PaymentScope;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class PaymentOperationalMetricsTest {
    private final SimpleMeterRegistry registry = new SimpleMeterRegistry();
    private final PaymentOperationalMetrics metrics = new PaymentOperationalMetrics(registry);

    @Test
    void recordsLowCardinalityPaymentInitiationTags() {
        metrics.recordPaymentInitiation(PaymentScope.STORE, "MERCADOPAGO", "success");

        assertThat(registry.get("barmi_payment_initiation_total")
                .tag("scope", "STORE")
                .tag("provider", "mercado_pago")
                .tag("result", "success")
                .counter()
                .count()).isEqualTo(1.0);
    }

    @Test
    void normalizesUnknownWebhookLabels() {
        metrics.recordWebhook("provider-id-123", "store-123", "accepted-ish", "order-123");

        assertThat(registry.get("barmi_webhooks_received_total")
                .tag("provider", "unknown")
                .tag("scope", "unknown")
                .tag("result", "failure")
                .tag("reason", "unknown")
                .counter()
                .count()).isEqualTo(1.0);
    }

    @Test
    void recordsProviderRequestAndLatencyWithoutIds() {
        metrics.recordPaymentProviderRequest("create_preference", "failure");
        metrics.recordPaymentProviderLatency("create_preference", 1_000_000L);

        assertThat(registry.get("barmi_payment_provider_requests_total")
                .tag("provider", "mercado_pago")
                .tag("operation", "create_preference")
                .tag("result", "failure")
                .counter()
                .count()).isEqualTo(1.0);
        assertThat(registry.get("barmi_payment_provider_latency_seconds")
                .tag("provider", "mercado_pago")
                .tag("operation", "create_preference")
                .timer()
                .count()).isEqualTo(1L);
    }
}
