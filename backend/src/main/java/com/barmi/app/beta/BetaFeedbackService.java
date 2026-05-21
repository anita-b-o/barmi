package com.barmi.app.beta;

import com.barmi.domain.beta.BetaFeedbackEntry;
import com.barmi.infra.repo.BetaFeedbackEntryRepository;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Service
public class BetaFeedbackService {

    private static final Set<String> ALLOWED_CATEGORIES = Set.of("bug", "confusing", "missing", "love_it");

    private final BetaFeedbackEntryRepository betaFeedbackEntryRepository;
    private final MeterRegistry meterRegistry;

    public BetaFeedbackService(BetaFeedbackEntryRepository betaFeedbackEntryRepository, MeterRegistry meterRegistry) {
        this.betaFeedbackEntryRepository = betaFeedbackEntryRepository;
        this.meterRegistry = meterRegistry;
    }

    @Transactional
    public void submit(BetaFeedbackRequest request) {
        String category = normalizeCategory(request.category());
        Integer score = request.score();
        if (score != null && (score < 1 || score > 5)) {
            throw new IllegalArgumentException("feedback_score_invalid");
        }

        String message = cleanText(request.message(), 1000);
        if (message == null || message.length() < 4) {
            throw new IllegalArgumentException("feedback_message_too_short");
        }

        betaFeedbackEntryRepository.save(new BetaFeedbackEntry(
                UUID.randomUUID(),
                category,
                score,
                message,
                requiredRoute(request.route(), "feedback_route_required"),
                request.storeId(),
                cleanText(request.storeSlug(), 120),
                cleanText(request.ecosystemSlug(), 120),
                cleanText(request.requestId(), 120),
                requiredText(request.sessionId(), "feedback_session_required", 120),
                requiredText(request.releaseId(), "feedback_release_required", 120),
                requiredText(request.environment(), "feedback_environment_required", 64)
        ));

        meterRegistry.counter("barmi_beta_feedback_total", "category", category).increment();
    }

    private String normalizeCategory(String value) {
        String normalized = requiredText(value, "feedback_category_required", 32).toLowerCase(Locale.ROOT);
        if (!ALLOWED_CATEGORIES.contains(normalized)) {
            throw new IllegalArgumentException("feedback_category_invalid");
        }
        return normalized;
    }

    private String requiredText(String value, String errorCode, int maxLength) {
        String normalized = cleanText(value, maxLength);
        if (normalized == null) {
            throw new IllegalArgumentException(errorCode);
        }
        return normalized;
    }

    private String requiredRoute(String value, String errorCode) {
        String normalized = requiredText(value, errorCode, 255);
        int queryIndex = normalized.indexOf('?');
        int hashIndex = normalized.indexOf('#');
        int endIndex = normalized.length();
        if (queryIndex >= 0) {
            endIndex = Math.min(endIndex, queryIndex);
        }
        if (hashIndex >= 0) {
            endIndex = Math.min(endIndex, hashIndex);
        }
        String route = normalized.substring(0, endIndex).trim();
        if (route.isEmpty()) {
            throw new IllegalArgumentException(errorCode);
        }
        return route;
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
