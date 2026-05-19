package com.barmi.api.webhooks;

import com.barmi.app.payments.StorePaymentConfirmationService;
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
        mockMvc.perform(post("/api/webhooks/mercadopago")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"event_id\":\"9b12fe40-3ab7-4bb8-83f6-a4a1f382b19c\",\"status\":\"approved\",\"operation_id\":\"8876317e-1655-4805-8d6d-6c4970f178dd\",\"provider_payment_id\":\"mp_1\",\"amount\":5.00,\"currency\":\"ARS\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("invalid_secret"))
                .andExpect(jsonPath("$.error.requestId").isNotEmpty());
    }

    @Test
    void rejectsMalformedPayload() throws Exception {
        mockMvc.perform(post("/api/webhooks/mercadopago")
                        .header("X-Barmi-Webhook-Secret", "secret")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"approved\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("missing_event_id"))
                .andExpect(jsonPath("$.error.requestId").isNotEmpty());
    }

    @Test
    void rejectsDuplicateWebhookEvent() throws Exception {
        String payload = "{\"event_id\":\"9b12fe40-3ab7-4bb8-83f6-a4a1f382b19c\",\"status\":\"approved\",\"operation_id\":\"8876317e-1655-4805-8d6d-6c4970f178dd\",\"provider_payment_id\":\"mp_1\",\"amount\":5.00,\"currency\":\"ARS\"}";

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
    }
}
