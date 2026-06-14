package com.barmi.infra.payments;

import com.barmi.infra.metrics.PaymentOperationalMetrics;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpServer;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.math.BigDecimal;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class MercadoPagoApiClientTest {
    private final SimpleMeterRegistry registry = new SimpleMeterRegistry();
    private final PaymentOperationalMetrics metrics = new PaymentOperationalMetrics(registry);
    private HttpServer server;

    @AfterEach
    void stopServer() {
        if (server != null) {
            server.stop(0);
        }
    }

    @Test
    void recordsProviderFailureAndLatencyWhenUnconfigured() {
        MercadoPagoApiClient client = new MercadoPagoApiClient(new ObjectMapper(), metrics, "", "http://localhost");

        assertThatThrownBy(() -> client.createPreference(preferenceRequest()))
                .isInstanceOf(ResponseStatusException.class);

        assertThat(counter("barmi_payment_provider_requests_total", "create_preference", "failure")).isEqualTo(1.0);
        assertThat(timerCount("create_preference")).isEqualTo(1L);
    }

    @Test
    void recordsProviderSuccessAndLatencyForCreatePreference() throws IOException {
        server = HttpServer.create(new InetSocketAddress(0), 0);
        server.createContext("/checkout/preferences", exchange -> {
            byte[] body = "{\"id\":\"pref-1\",\"init_point\":\"https://checkout.example/pref-1\"}"
                    .getBytes(StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(200, body.length);
            exchange.getResponseBody().write(body);
            exchange.close();
        });
        server.start();

        MercadoPagoApiClient client = new MercadoPagoApiClient(
                new ObjectMapper(),
                metrics,
                "token",
                "http://localhost:" + server.getAddress().getPort()
        );

        MercadoPagoApiClient.PreferenceResponse response = client.createPreference(preferenceRequest());

        assertThat(response.id()).isEqualTo("pref-1");
        assertThat(counter("barmi_payment_provider_requests_total", "create_preference", "success")).isEqualTo(1.0);
        assertThat(timerCount("create_preference")).isEqualTo(1L);
    }

    private MercadoPagoApiClient.PreferenceRequest preferenceRequest() {
        return new MercadoPagoApiClient.PreferenceRequest(
                List.of(new MercadoPagoApiClient.PreferenceItem(
                        "intent-1",
                        "Order",
                        "Order",
                        1,
                        "ARS",
                        new BigDecimal("100.00")
                )),
                new MercadoPagoApiClient.PreferenceBackUrls(
                        "https://return.example",
                        "https://return.example",
                        "https://return.example"
                ),
                "approved",
                "https://api.example/webhook",
                "STORE:order",
                Map.of("scope", "STORE")
        );
    }

    private double counter(String name, String operation, String result) {
        return registry.get(name)
                .tag("provider", "mercado_pago")
                .tag("operation", operation)
                .tag("result", result)
                .counter()
                .count();
    }

    private long timerCount(String operation) {
        return registry.get("barmi_payment_provider_latency_seconds")
                .tag("provider", "mercado_pago")
                .tag("operation", operation)
                .timer()
                .count();
    }
}
