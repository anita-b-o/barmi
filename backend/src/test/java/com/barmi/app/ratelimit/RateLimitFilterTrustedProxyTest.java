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
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "app.rateLimit.enabled=true",
        "app.tenant.trustProxyHeaders=true",
        "app.mercadoPago.replayGuard.enabled=false"
})
class RateLimitFilterTrustedProxyTest {

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
    void rateLimitGroupsByTrustedForwardedForIp() throws Exception {
        Map<String, Long> counters = new ConcurrentHashMap<>();
        when(valueOperations.increment(anyString())).thenAnswer(invocation -> counters.merge(invocation.getArgument(0), 1L, Long::sum));

        for (int i = 0; i < 5; i++) {
            loginFrom("203.0.113.10").andExpect(status().isOk());
        }

        loginFrom("203.0.113.11").andExpect(status().isOk());
        loginFrom("203.0.113.10").andExpect(status().isTooManyRequests());
    }

    private org.springframework.test.web.servlet.ResultActions loginFrom(String forwardedFor) throws Exception {
        return mockMvc.perform(post("/api/auth/login")
                .with(request -> {
                    request.setRemoteAddr("198.51.100.10");
                    return request;
                })
                .header("X-Forwarded-For", forwardedFor)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"demo@example.com\",\"password\":\"secret\"}"));
    }
}
