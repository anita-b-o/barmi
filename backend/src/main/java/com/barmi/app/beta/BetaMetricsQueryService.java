package com.barmi.app.beta;

import com.barmi.infra.repo.BetaFeedbackEntryRepository;
import com.barmi.infra.repo.BetaProductEventRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class BetaMetricsQueryService {

    private static final Pattern REASON_PATTERN = Pattern.compile("\"reason\"\\s*:\\s*\"([^\"]+)\"");
    private static final Pattern EMAIL_PATTERN = Pattern.compile("[^\\s@]+@[^\\s@]+\\.[^\\s@]+");
    private static final Pattern TOKENISH_PATTERN = Pattern.compile("\\b[A-Za-z0-9_-]{24,}\\b");
    private static final Pattern PHONEISH_PATTERN = Pattern.compile("\\+?[0-9][0-9\\s().-]{7,}[0-9]");

    private final BetaProductEventRepository betaProductEventRepository;
    private final BetaFeedbackEntryRepository betaFeedbackEntryRepository;

    public BetaMetricsQueryService(
            BetaProductEventRepository betaProductEventRepository,
            BetaFeedbackEntryRepository betaFeedbackEntryRepository
    ) {
        this.betaProductEventRepository = betaProductEventRepository;
        this.betaFeedbackEntryRepository = betaFeedbackEntryRepository;
    }

    public BetaMetricsSummaryView summary() {
        Map<String, Long> counts = betaProductEventRepository.countAllByEventName().stream()
                .collect(Collectors.toMap(BetaProductEventRepository.EventCountView::getEventName, BetaProductEventRepository.EventCountView::getTotal));
        Map<String, Long> feedbackCounts = betaFeedbackEntryRepository.countAllByCategory().stream()
                .collect(Collectors.toMap(BetaFeedbackEntryRepository.CategoryCountView::getCategory, BetaFeedbackEntryRepository.CategoryCountView::getTotal));

        long checkoutStarted = counts.getOrDefault("checkout_started", 0L);
        long checkoutSuccess = counts.getOrDefault("checkout_success", 0L);
        long checkoutFailure = counts.getOrDefault("checkout_failure", 0L);
        long checkoutAbandoned = Math.max(0, checkoutStarted - checkoutSuccess - checkoutFailure);
        long feedbackSubmitted = feedbackCounts.values().stream().mapToLong(Long::longValue).sum();
        long loginSuccess = counts.getOrDefault("login_success", 0L);
        long loginFailure = counts.getOrDefault("login_failure", 0L);

        return new BetaMetricsSummaryView(
                counts.getOrDefault("ecosystem_home_view", 0L),
                counts.getOrDefault("catalog_view", 0L),
                counts.getOrDefault("map_view", 0L),
                counts.getOrDefault("store_view", 0L),
                counts.getOrDefault("search_used", 0L),
                counts.getOrDefault("search_no_results", 0L),
                counts.getOrDefault("product_click", 0L),
                counts.getOrDefault("store_click", 0L),
                counts.getOrDefault("map_pin_click", 0L),
                checkoutStarted,
                counts.getOrDefault("payment_initiated", 0L),
                checkoutSuccess,
                checkoutFailure,
                checkoutAbandoned,
                ratio(checkoutSuccess, checkoutStarted),
                loginSuccess,
                loginFailure,
                ratio(loginFailure, loginSuccess + loginFailure),
                feedbackSubmitted,
                feedbackCounts.getOrDefault("bug", 0L),
                feedbackCounts.getOrDefault("confusing", 0L),
                feedbackCounts.getOrDefault("missing", 0L),
                feedbackCounts.getOrDefault("love_it", 0L),
                betaProductEventRepository.findTopStoreViews(PageRequest.of(0, 5)).stream()
                        .map(view -> new BetaMetricsSummaryView.TopStoreView(view.getStoreSlug(), view.getStoreName(), view.getViews()))
                        .toList(),
                betaProductEventRepository.findTopSearchTerms(PageRequest.of(0, 5)).stream()
                        .map(view -> new BetaMetricsSummaryView.TopSearchView(view.getSearchTerm(), view.getUses()))
                        .toList(),
                betaFeedbackEntryRepository.findTopFeedbackRoutes(PageRequest.of(0, 25)).stream()
                        .collect(Collectors.groupingBy(
                                view -> displayRoute(view.getRoute()),
                                Collectors.summingLong(BetaFeedbackEntryRepository.FeedbackRouteCountView::getTotal)
                        ))
                        .entrySet()
                        .stream()
                        .sorted(Map.Entry.<String, Long>comparingByValue().reversed().thenComparing(Map.Entry.comparingByKey()))
                        .limit(5)
                        .map(entry -> new BetaMetricsSummaryView.FeedbackRouteView(entry.getKey(), entry.getValue()))
                        .toList(),
                betaFeedbackEntryRepository.findRecentFeedback(PageRequest.of(0, 5)).stream()
                        .map(view -> new BetaMetricsSummaryView.RecentFeedbackView(
                                view.getCategory(),
                                view.getScore(),
                                abbreviate(view.getMessage(), 140),
                                displayRoute(view.getRoute()),
                                view.getRequestId(),
                                view.getReleaseId(),
                                view.getCreatedAt()
                        ))
                        .toList(),
                betaProductEventRepository.findRecentFailures(PageRequest.of(0, 5)).stream()
                        .map(view -> new BetaMetricsSummaryView.RecentFailureView(
                                view.getEventName(),
                                displayRoute(view.getRoute()),
                                view.getRequestId(),
                                view.getReleaseId(),
                                view.getOccurredAt(),
                                extractReason(view.getMetadataJson())
                        ))
                        .toList()
        );
    }

    private BigDecimal ratio(long numerator, long denominator) {
        if (denominator <= 0) {
            return BigDecimal.ZERO;
        }
        return BigDecimal.valueOf(numerator)
                .multiply(BigDecimal.valueOf(100))
                .divide(BigDecimal.valueOf(denominator), 1, RoundingMode.HALF_UP);
    }

    private String extractReason(String metadataJson) {
        if (metadataJson == null || metadataJson.isBlank()) {
            return null;
        }
        Matcher matcher = REASON_PATTERN.matcher(metadataJson);
        if (!matcher.find()) {
            return null;
        }
        String reason = matcher.group(1);
        if (containsSensitiveValue(reason)) {
            return null;
        }
        return abbreviate(reason, 80);
    }

    private String abbreviate(String value, int maxLength) {
        if (value == null || value.length() <= maxLength) {
            return value;
        }
        return value.substring(0, Math.max(0, maxLength - 1)) + "…";
    }

    private String displayRoute(String value) {
        if (value == null || value.isBlank()) {
            return "/";
        }
        String normalized = value.trim();
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
        return route.isEmpty() ? "/" : route;
    }

    private boolean containsSensitiveValue(String value) {
        return EMAIL_PATTERN.matcher(value).find()
                || PHONEISH_PATTERN.matcher(value).find()
                || TOKENISH_PATTERN.matcher(value).find();
    }
}
