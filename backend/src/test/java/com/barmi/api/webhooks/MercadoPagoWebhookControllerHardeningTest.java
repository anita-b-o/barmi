package com.barmi.api.webhooks;

import com.barmi.app.payments.StorePaymentConfirmationService;
import io.micrometer.core.instrument.MeterRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
        "app.mercadoPago.webhookSecret=secret",
        "app.rateLimit.enabled=false",
        "app.mercadoPago.replayGuard.enabled=true"
})
@AutoConfigureMockMvc
@TestPropertySource(properties = "app.security.allowDevIdentityHeader=true")
class MercadoPagoWebhookControllerHardeningTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private StorePaymentConfirmationService storePaymentConfirmationService;

    @Autowired
    private MeterRegistry meterRegistry;

    @MockBean
    private StringRedisTemplate redisTemplate;

    @SuppressWarnings("unchecked")
    private final ValueOperations<String, String> valueOperations = Mockito.mock(ValueOperations.class);

    @BeforeEach
    void setUp() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        Map<String, Boolean> replayKeys = new ConcurrentHashMap<>();
        when(valueOperations.setIfAbsent(anyString(), anyString(), any())).thenAnswer(invocation ->
                replayKeys.putIfAbsent(invocation.getArgument(0), true) == null
        );
    }

    @Test
    void rejectsInvalidSecret() throws Exception {
        double before = webhookCounter("store", "rejected", "signature_invalid");

        mockMvc.perform(post("/api/webhooks/mercadopago")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"event_id\":\"9b12fe40-3ab7-4bb8-83f6-a4a1f382b19c\",\"status\":\"approved\",\"operation_id\":\"8876317e-1655-4805-8d6d-6c4970f178dd\",\"provider_payment_id\":\"mp_1\",\"amount\":5.00,\"currency\":\"ARS\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("invalid_secret"))
                .andExpect(jsonPath("$.error.requestId").isNotEmpty());

        org.assertj.core.api.Assertions.assertThat(webhookCounter("store", "rejected", "signature_invalid") - before)
                .isEqualTo(1.0);
    }

    @Test
    void rejectsMalformedPayload() throws Exception {
        double before = webhookCounter("store", "rejected", "payload_invalid");

        mockMvc.perform(post("/api/webhooks/mercadopago")
                        .header("X-Barmi-Webhook-Secret", "secret")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"approved\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("missing_event_id"))
                .andExpect(jsonPath("$.error.requestId").isNotEmpty());

        org.assertj.core.api.Assertions.assertThat(webhookCounter("store", "rejected", "payload_invalid") - before)
                .isEqualTo(1.0);
    }

    @Test
    void rejectsDuplicateWebhookEvent() throws Exception {
        String payload = "{\"event_id\":\"9b12fe40-3ab7-4bb8-83f6-a4a1f382b19c\",\"status\":\"approved\",\"operation_id\":\"8876317e-1655-4805-8d6d-6c4970f178dd\",\"provider_payment_id\":\"mp_1\",\"amount\":5.00,\"currency\":\"ARS\"}";
        double acceptedBefore = webhookCounter("store", "accepted", "processed");
        double replayBefore = webhookCounter("store", "rejected", "replay");

        mockMvc.perform(post("/api/webhooks/mercadopago")
                        .header("X-Barmi-Webhook-Secret", "secret")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/webhooks/mercadopago")
                        .header("X-Barmi-Webhook-Secret", "secret")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("duplicate_webhook_event"))
                .andExpect(jsonPath("$.error.requestId").isNotEmpty());

        org.assertj.core.api.Assertions.assertThat(webhookCounter("store", "accepted", "processed") - acceptedBefore)
                .isEqualTo(1.0);
        org.assertj.core.api.Assertions.assertThat(webhookCounter("store", "rejected", "replay") - replayBefore)
                .isEqualTo(1.0);
    }

    @Test
    void recordsIgnoredWebhookMetricForUnsupportedStatus() throws Exception {
        String payload = "{\"event_id\":\"11111111-1111-4111-8111-111111111111\",\"status\":\"pending\",\"operation_id\":\"8876317e-1655-4805-8d6d-6c4970f178dd\",\"provider_payment_id\":\"mp_2\",\"amount\":5.00,\"currency\":\"ARS\"}";
        double before = webhookCounter("store", "ignored", "unsupported");

        mockMvc.perform(post("/api/webhooks/mercadopago")
                        .header("X-Barmi-Webhook-Secret", "secret")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isOk());

        org.assertj.core.api.Assertions.assertThat(webhookCounter("store", "ignored", "unsupported") - before)
                .isEqualTo(1.0);
    }

    private double webhookCounter(String scope, String result, String reason) {
        io.micrometer.core.instrument.Counter counter = meterRegistry.find("barmi_webhooks_received_total")
                .tag("provider", "mercado_pago")
                .tag("scope", scope)
                .tag("result", result)
                .tag("reason", reason)
                .counter();
        return counter == null ? 0.0 : counter.count();
    }
}
