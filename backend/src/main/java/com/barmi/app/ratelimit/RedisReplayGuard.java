package com.barmi.app.ratelimit;

import com.barmi.app.auth.RefreshTokenCodec;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;

@Service
public class RedisReplayGuard {

    private final StringRedisTemplate redisTemplate;
    private final RefreshTokenCodec refreshTokenCodec;
    private final boolean enabled;
    private final Counter unavailableCounter;

    public RedisReplayGuard(
            StringRedisTemplate redisTemplate,
            RefreshTokenCodec refreshTokenCodec,
            MeterRegistry meterRegistry,
            @Value("${app.mercadoPago.replayGuard.enabled:true}") boolean enabled
    ) {
        this.redisTemplate = redisTemplate;
        this.refreshTokenCodec = refreshTokenCodec;
        this.enabled = enabled;
        this.unavailableCounter = meterRegistry.counter("barmi_webhook_replay_guard_unavailable_total");
    }

    public ReplayDecision claim(String namespace, String eventKey, Duration ttl) {
        String stableKey = eventKey == null || eventKey.isBlank() ? "anonymous" : eventKey.trim();
        String anonymizedKey = refreshTokenCodec.hash(stableKey).substring(0, 12);
        if (!enabled) {
            return ReplayDecision.allowed(anonymizedKey);
        }

        try {
            Boolean created = redisTemplate.opsForValue().setIfAbsent(
                    "barmi:replay:" + namespace + ":" + refreshTokenCodec.hash(stableKey),
                    "1",
                    ttl
            );
            if (Boolean.TRUE.equals(created)) {
                return ReplayDecision.allowed(anonymizedKey);
            }
            return ReplayDecision.duplicate(anonymizedKey);
        } catch (Exception ex) {
            unavailableCounter.increment();
            return ReplayDecision.backendUnavailable(anonymizedKey);
        }
    }

    public record ReplayDecision(boolean allowed, boolean backendUnavailable, boolean duplicate, String anonymizedKey) {
        public static ReplayDecision allowed(String anonymizedKey) {
            return new ReplayDecision(true, false, false, anonymizedKey);
        }

        public static ReplayDecision duplicate(String anonymizedKey) {
            return new ReplayDecision(false, false, true, anonymizedKey);
        }

        public static ReplayDecision backendUnavailable(String anonymizedKey) {
            return new ReplayDecision(true, true, false, anonymizedKey);
        }
    }
}
