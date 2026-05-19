package com.barmi.app.beta;

import com.barmi.domain.beta.BetaProductEvent;
import com.barmi.infra.repo.BetaProductEventRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;

@Service
public class BetaTelemetryService {

    private static final Set<String> ALLOWED_EVENTS = Set.of(
            "ecosystem_home_view",
            "catalog_view",
            "map_view",
            "store_view",
            "search_used",
            "product_click",
            "store_click",
            "map_pin_click",
            "checkout_started",
            "payment_initiated",
            "checkout_success",
            "checkout_failure",
            "login_success",
            "login_failure",
            "logout"
    );
    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");
    private static final Pattern TOKENISH_PATTERN = Pattern.compile("^[A-Za-z0-9_-]{24,}$");
    private static final Pattern PHONEISH_PATTERN = Pattern.compile("^\\+?[0-9][0-9\\s()-]{7,}$");

    private final BetaProductEventRepository betaProductEventRepository;
    private final MeterRegistry meterRegistry;
    private final ObjectMapper objectMapper;

    public BetaTelemetryService(
            BetaProductEventRepository betaProductEventRepository,
            MeterRegistry meterRegistry,
            ObjectMapper objectMapper
    ) {
        this.betaProductEventRepository = betaProductEventRepository;
        this.meterRegistry = meterRegistry;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public void ingest(BetaTelemetryIngestRequest request) {
        String eventName = normalizeEventName(request.eventName());
        String searchTerm = sanitizeSearchTerm(request.searchTerm());
        String category = eventCategory(eventName);
        Map<String, String> metadata = sanitizeMetadata(request.metadata());

        betaProductEventRepository.save(new BetaProductEvent(
                UUID.randomUUID(),
                eventName,
                category,
                request.storeId(),
                cleanText(request.storeSlug(), 120),
                cleanText(request.storeName(), 160),
                cleanText(request.ecosystemSlug(), 120),
                cleanText(request.productId(), 120),
                searchTerm,
                cleanText(request.requestId(), 120),
                requiredText(request.sessionId(), "session_id_required", 120),
                requiredText(request.route(), "route_required", 255),
                requiredText(request.releaseId(), "release_id_required", 120),
                requiredText(request.environment(), "environment_required", 64),
                toJson(metadata),
                request.occurredAt() == null ? Instant.now() : request.occurredAt()
        ));

        meterRegistry.counter(
                "barmi_beta_product_events_total",
                "event_name", eventName,
                "event_category", category
        ).increment();
    }

    private String normalizeEventName(String value) {
        String normalized = requiredText(value, "event_name_required", 64).toLowerCase(Locale.ROOT);
        if (!ALLOWED_EVENTS.contains(normalized)) {
            throw new IllegalArgumentException("event_name_not_allowed");
        }
        return normalized;
    }

    private String eventCategory(String eventName) {
        return switch (eventName) {
            case "ecosystem_home_view", "catalog_view", "map_view", "store_view", "search_used" -> "DISCOVERY";
            case "product_click", "store_click", "map_pin_click" -> "ENGAGEMENT";
            case "checkout_started", "payment_initiated", "checkout_success", "checkout_failure" -> "CHECKOUT";
            case "login_success", "login_failure", "logout" -> "AUTH";
            default -> "OTHER";
        };
    }

    private String sanitizeSearchTerm(String value) {
        String normalized = cleanText(value, 120);
        if (normalized == null) {
            return null;
        }
        String compact = normalized.replaceAll("\\s+", " ").trim().toLowerCase(Locale.ROOT);
        if (compact.length() < 2) {
            return null;
        }
        if (EMAIL_PATTERN.matcher(compact).matches() || PHONEISH_PATTERN.matcher(compact).matches() || TOKENISH_PATTERN.matcher(compact).matches()) {
            return null;
        }
        return compact;
    }

    private Map<String, String> sanitizeMetadata(Map<String, String> metadata) {
        Map<String, String> sanitized = new LinkedHashMap<>();
        if (metadata == null) {
            return sanitized;
        }
        metadata.forEach((key, value) -> {
            String cleanKey = cleanText(key, 64);
            String cleanValue = cleanText(value, 160);
            if (cleanKey != null && cleanValue != null) {
                sanitized.put(cleanKey, cleanValue);
            }
        });
        return sanitized;
    }

    private String toJson(Map<String, String> metadata) {
        try {
            return objectMapper.writeValueAsString(metadata);
        } catch (JsonProcessingException ex) {
            throw new IllegalArgumentException("invalid_metadata_json");
        }
    }

    private String requiredText(String value, String errorCode, int maxLength) {
        String normalized = cleanText(value, maxLength);
        if (normalized == null) {
            throw new IllegalArgumentException(errorCode);
        }
        return normalized;
    }

    private String cleanText(String value, int maxLength) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        if (normalized.isEmpty()) {
            return null;
        }
        return normalized.length() > maxLength ? normalized.substring(0, maxLength) : normalized;
    }
}
