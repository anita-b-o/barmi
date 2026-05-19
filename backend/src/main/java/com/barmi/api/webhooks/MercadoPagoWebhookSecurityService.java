package com.barmi.api.webhooks;

import com.barmi.app.config.ObservabilitySupport;
import com.barmi.app.ratelimit.RedisReplayGuard;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.time.format.DateTimeParseException;
import java.util.HashMap;
import java.util.Map;
import java.util.Objects;

@Service
public class MercadoPagoWebhookSecurityService {
    private static final Logger log = LoggerFactory.getLogger(MercadoPagoWebhookSecurityService.class);
    public static final String TIMESTAMP_HEADER = "X-Barmi-Webhook-Timestamp";
    public static final String SIGNATURE_HEADER = "x-signature";
    public static final String REQUEST_ID_HEADER = "x-request-id";

    private final String secret;
    private final long timestampToleranceSeconds;
    private final Duration replayTtl;
    private final RedisReplayGuard replayGuard;

    public MercadoPagoWebhookSecurityService(
            @Value("${app.mercadoPago.webhookSecret}") String secret,
            @Value("${app.mercadoPago.timestampToleranceSeconds:300}") long timestampToleranceSeconds,
            @Value("${app.mercadoPago.replayGuardTtlMinutes:1440}") long replayGuardTtlMinutes,
            RedisReplayGuard replayGuard
    ) {
        this.secret = secret;
        this.timestampToleranceSeconds = timestampToleranceSeconds;
        this.replayTtl = Duration.ofMinutes(replayGuardTtlMinutes);
        this.replayGuard = replayGuard;
    }

    public void validate(
            String provider,
            String headerSecret,
            String timestampHeader,
            String eventId,
            HttpServletRequest request
    ) {
        String requestId = ObservabilitySupport.requestId(request);
        int retryCount = ObservabilitySupport.retryCount(request);
        if (headerSecret == null || !headerSecret.equals(secret)) {
            log.warn("webhook_rejected category=api_error_webhook_failure provider={} request_id={} reason=invalid_signature event_id={} retry_count={}",
                    provider, requestId, eventId, retryCount);
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "invalid_secret");
        }

        validateTimestamp(provider, timestampHeader, eventId, requestId);
        claimReplay(provider, eventId, requestId);
    }

    public void validateMercadoPagoSignature(
            String provider,
            String signatureHeader,
            String requestIdHeader,
            String dataId,
            String eventId,
            HttpServletRequest request
    ) {
        String requestId = ObservabilitySupport.requestId(request);
        if (signatureHeader == null || signatureHeader.isBlank() || requestIdHeader == null || requestIdHeader.isBlank()) {
            log.warn("webhook_rejected category=api_error_webhook_failure provider={} request_id={} reason=invalid_signature event_id={} retry_count={}",
                    provider, requestId, eventId, ObservabilitySupport.retryCount(request));
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "invalid_signature");
        }

        Map<String, String> parts = parseSignatureHeader(signatureHeader);
        String ts = parts.get("ts");
        String receivedHash = parts.get("v1");
        if (ts == null || ts.isBlank() || receivedHash == null || receivedHash.isBlank()) {
            log.warn("webhook_rejected category=api_error_webhook_failure provider={} request_id={} reason=invalid_signature event_id={} retry_count={}",
                    provider, requestId, eventId, ObservabilitySupport.retryCount(request));
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "invalid_signature");
        }

        String manifest = "id:" + normalizeDataId(dataId) + ";request-id:" + requestIdHeader + ";ts:" + ts + ";";
        String expectedHash = hmacSha256Hex(secret, manifest);
        if (!Objects.equals(expectedHash, receivedHash)) {
            log.warn("webhook_rejected category=api_error_webhook_failure provider={} request_id={} reason=invalid_signature event_id={} retry_count={}",
                    provider, requestId, eventId, ObservabilitySupport.retryCount(request));
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "invalid_signature");
        }

        validateTimestamp(provider, ts, eventId, requestId);
        claimReplay(provider, eventId == null || eventId.isBlank() ? dataId : eventId, requestId);
    }

    public void logPayloadError(String provider, String eventId, HttpServletRequest request, String reason) {
        log.warn(
                "webhook_rejected category=api_error_webhook_failure provider={} request_id={} reason={} event_id={} retry_count={}",
                provider,
                ObservabilitySupport.requestId(request),
                reason,
                eventId,
                ObservabilitySupport.retryCount(request)
        );
    }

    private void validateTimestamp(String provider, String timestampHeader, String eventId, String requestId) {
        if (timestampHeader == null || timestampHeader.isBlank()) {
            return;
        }
        Instant timestamp = parseTimestamp(timestampHeader);
        long deltaSeconds = Math.abs(Duration.between(timestamp, Instant.now()).getSeconds());
        if (deltaSeconds > timestampToleranceSeconds) {
            log.warn("webhook_rejected category=api_error_webhook_failure provider={} request_id={} reason=timeout event_id={}",
                    provider, requestId, eventId);
            throw new ResponseStatusException(HttpStatus.CONFLICT, "webhook_timestamp_outside_window");
        }
    }

    private void claimReplay(String provider, String eventId, String requestId) {
        RedisReplayGuard.ReplayDecision decision = replayGuard.claim(provider, eventId, replayTtl);
        if (decision.backendUnavailable()) {
            log.warn(
                    "rate_limit_backend_unavailable limiter=webhook_replay_guard route={} request_id={} anonymized_key={}",
                    provider,
                    requestId,
                    decision.anonymizedKey()
            );
            return;
        }
        if (decision.duplicate()) {
            log.warn("webhook_rejected category=api_error_webhook_failure provider={} request_id={} reason=replay event_id={}",
                    provider, requestId, eventId);
            throw new ResponseStatusException(HttpStatus.CONFLICT, "duplicate_webhook_event");
        }
    }

    private Instant parseTimestamp(String value) {
        try {
            if (value.matches("^\\d+$")) {
                long numeric = Long.parseLong(value);
                if (value.length() > 10) {
                    return Instant.ofEpochMilli(numeric);
                }
                return Instant.ofEpochSecond(numeric);
            }
            return Instant.parse(value);
        } catch (DateTimeParseException | NumberFormatException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid_webhook_timestamp");
        }
    }

    private Map<String, String> parseSignatureHeader(String value) {
        Map<String, String> parts = new HashMap<>();
        for (String piece : value.split(",")) {
            String[] keyValue = piece.split("=", 2);
            if (keyValue.length == 2) {
                parts.put(keyValue[0].trim(), keyValue[1].trim());
            }
        }
        return parts;
    }

    private String normalizeDataId(String dataId) {
        return dataId == null ? "" : dataId.trim().toLowerCase();
    }

    private String hmacSha256Hex(String key, String payload) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] digest = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
            StringBuilder builder = new StringBuilder(digest.length * 2);
            for (byte value : digest) {
                builder.append(String.format("%02x", value));
            }
            return builder.toString();
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "webhook_signature_error");
        }
    }
}
