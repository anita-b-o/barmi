package com.barmi.app.ratelimit;

import com.barmi.app.auth.RefreshTokenCodec;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.atomic.AtomicBoolean;

@Service
public class RedisFixedWindowRateLimiter {

    private final StringRedisTemplate redisTemplate;
    private final RefreshTokenCodec refreshTokenCodec;
    private final boolean enabled;
    private final Counter unavailableCounter;
    private final Counter recoveredCounter;
    private final Counter failOpenRequestsCounter;
    private final AtomicBoolean degraded = new AtomicBoolean(false);

    public RedisFixedWindowRateLimiter(
            StringRedisTemplate redisTemplate,
            RefreshTokenCodec refreshTokenCodec,
            MeterRegistry meterRegistry,
            @Value("${app.rateLimit.enabled:true}") boolean enabled
    ) {
        this.redisTemplate = redisTemplate;
        this.refreshTokenCodec = refreshTokenCodec;
        this.enabled = enabled;
        this.unavailableCounter = meterRegistry.counter("barmi_rate_limit_backend_unavailable_total");
        this.recoveredCounter = meterRegistry.counter("barmi_rate_limit_backend_recovered_total");
        this.failOpenRequestsCounter = meterRegistry.counter("barmi_rate_limit_fail_open_requests_total");
    }

    public RateLimitDecision check(String limiterName, String rawKey, long limit, Duration window) {
        String stableKey = sanitize(rawKey);
        String anonymizedKey = anonymize(stableKey);
        if (!enabled) {
            return RateLimitDecision.allowed(anonymizedKey, false);
        }

        try {
            long nowSeconds = Instant.now().getEpochSecond();
            long windowSeconds = Math.max(1L, window.getSeconds());
            long bucketStart = (nowSeconds / windowSeconds) * windowSeconds;
            long retryAfterSeconds = Math.max(1L, (bucketStart + windowSeconds) - nowSeconds);
            String redisKey = "barmi:ratelimit:" + limiterName + ":" + bucketStart + ":" + refreshTokenCodec.hash(stableKey);

            Long currentCount = redisTemplate.opsForValue().increment(redisKey);
            if (currentCount != null && currentCount == 1L) {
                redisTemplate.expire(redisKey, window.plusSeconds(5));
            }

            boolean recovered = degraded.compareAndSet(true, false);
            if (recovered) {
                recoveredCounter.increment();
            }

            long observedCount = currentCount == null ? 0L : currentCount;
            if (currentCount != null && currentCount > limit) {
                return RateLimitDecision.blocked(anonymizedKey, retryAfterSeconds, observedCount, recovered);
            }
            return RateLimitDecision.allowed(anonymizedKey, recovered);
        } catch (Exception ex) {
            unavailableCounter.increment();
            failOpenRequestsCounter.increment();
            boolean firstUnavailable = degraded.compareAndSet(false, true);
            return RateLimitDecision.backendUnavailable(anonymizedKey, firstUnavailable);
        }
    }

    public String anonymize(String rawValue) {
        String hash = refreshTokenCodec.hash(sanitize(rawValue));
        return hash.substring(0, Math.min(12, hash.length()));
    }

    private String sanitize(String rawKey) {
        if (rawKey == null || rawKey.isBlank()) {
            return "anonymous";
        }
        return rawKey.trim();
    }

    public record RateLimitDecision(
            boolean allowed,
            boolean backendUnavailable,
            boolean backendRecovered,
            boolean firstUnavailable,
            String anonymizedKey,
            long retryAfterSeconds,
            long currentCount
    ) {
        public static RateLimitDecision allowed(String anonymizedKey, boolean backendRecovered) {
            return new RateLimitDecision(true, false, backendRecovered, false, anonymizedKey, 0L, 0L);
        }

        public static RateLimitDecision blocked(String anonymizedKey, long retryAfterSeconds, long currentCount, boolean backendRecovered) {
            return new RateLimitDecision(false, false, backendRecovered, false, anonymizedKey, retryAfterSeconds, currentCount);
        }

        public static RateLimitDecision backendUnavailable(String anonymizedKey, boolean firstUnavailable) {
            return new RateLimitDecision(true, true, false, firstUnavailable, anonymizedKey, 0L, 0L);
        }
    }
}
