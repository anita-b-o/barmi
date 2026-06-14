package com.barmi.app.ratelimit;

import com.barmi.app.auth.AuthService;
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

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "app.rateLimit.enabled=true",
        "app.rateLimit.maxCachedBodyBytes=128",
        "app.mercadoPago.replayGuard.enabled=false"
})
class RateLimitFilterTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private AuthService authService;

    @MockBean
    private StringRedisTemplate redisTemplate;

    @SuppressWarnings("unchecked")
    private final ValueOperations<String, String> valueOperations = Mockito.mock(ValueOperations.class);

    @BeforeEach
    void setUp() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(redisTemplate.expire(anyString(), any())).thenReturn(true);

        AuthService.AuthTokens tokens = new AuthService.AuthTokens(
                "access-token",
                Instant.now().plus(30, ChronoUnit.MINUTES),
                "refresh-token",
                Instant.now().plus(30, ChronoUnit.DAYS),
                "Bearer"
        );
        when(authService.login(anyString(), anyString())).thenReturn(tokens);
    }

    @Test
    void bodyUnderLimitPasses() throws Exception {
        Map<String, Long> counters = new ConcurrentHashMap<>();
        when(valueOperations.increment(anyString())).thenAnswer(invocation -> counters.merge(invocation.getArgument(0), 1L, Long::sum));

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"demo@example.com\",\"password\":\"secret\"}"))
                .andExpect(status().isOk());
    }

    @Test
    void bodyOverLimitReturnsPayloadTooLargeAndDoesNotExecuteHandler() throws Exception {
        String oversizedBody = "{\"email\":\"demo@example.com\",\"password\":\"secret\",\"padding\":\"" + "x".repeat(160) + "\"}";

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(oversizedBody))
                .andExpect(status().isPayloadTooLarge())
                .andExpect(header().string("X-Max-Request-Body-Bytes", "128"))
                .andExpect(jsonPath("$.error.code").value("payload_too_large"))
                .andExpect(jsonPath("$.error.message").value("Payload too large"))
                .andExpect(jsonPath("$.error.status").value(413))
                .andExpect(jsonPath("$.error.requestId").isNotEmpty());

        verify(authService, never()).login(anyString(), anyString());
    }

    @Test
    void largeWebhookPayloadReturnsPayloadTooLarge() throws Exception {
        String oversizedBody = "{\"event_id\":\"evt_1\",\"payload\":\"" + "x".repeat(160) + "\"}";

        mockMvc.perform(post("/api/webhooks/mercadopago")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(oversizedBody))
                .andExpect(status().isPayloadTooLarge())
                .andExpect(jsonPath("$.error.code").value("payload_too_large"));
    }

    @Test
    void requestWithoutBodyDoesNotFailBodyLimit() throws Exception {
        mockMvc.perform(post("/api/auth/logout"))
                .andExpect(status().isOk());
    }

    @Test
    void sixthLoginRequestIsRateLimited() throws Exception {
        Map<String, Long> counters = new ConcurrentHashMap<>();
        when(valueOperations.increment(anyString())).thenAnswer(invocation -> counters.merge(invocation.getArgument(0), 1L, Long::sum));

        for (int i = 0; i < 5; i++) {
            mockMvc.perform(post("/api/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"email\":\"demo@example.com\",\"password\":\"secret\"}"))
                    .andExpect(status().isOk());
        }

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"demo@example.com\",\"password\":\"secret\"}"))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().exists("Retry-After"))
                .andExpect(jsonPath("$.error.code").value("rate_limited"))
                .andExpect(jsonPath("$.error.message").value("Too many requests"))
                .andExpect(jsonPath("$.error.requestId").isNotEmpty());
    }

    @Test
    void spoofedForwardedForDoesNotBypassRateLimitWhenProxyHeadersAreNotTrusted() throws Exception {
        Map<String, Long> counters = new ConcurrentHashMap<>();
        when(valueOperations.increment(anyString())).thenAnswer(invocation -> counters.merge(invocation.getArgument(0), 1L, Long::sum));

        for (int i = 0; i < 5; i++) {
            mockMvc.perform(post("/api/auth/login")
                            .with(request -> {
                                request.setRemoteAddr("198.51.100.10");
                                return request;
                            })
                            .header("X-Forwarded-For", "203.0.113." + i)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"email\":\"demo@example.com\",\"password\":\"secret\"}"))
                    .andExpect(status().isOk());
        }

        mockMvc.perform(post("/api/auth/login")
                        .with(request -> {
                            request.setRemoteAddr("198.51.100.10");
                            return request;
                        })
                        .header("X-Forwarded-For", "203.0.113.99")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"demo@example.com\",\"password\":\"secret\"}"))
                .andExpect(status().isTooManyRequests());
    }

    @Test
    void redisFailureFallsOpenAndDoesNotBlockLogin() throws Exception {
        when(valueOperations.increment(anyString())).thenThrow(new RuntimeException("redis_down"));

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"demo@example.com\",\"password\":\"secret\"}"))
                .andExpect(status().isOk());
    }
}
