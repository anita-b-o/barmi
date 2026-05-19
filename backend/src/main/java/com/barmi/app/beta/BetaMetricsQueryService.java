package com.barmi.app.beta;

import com.barmi.infra.repo.BetaFeedbackEntryRepository;
import com.barmi.infra.repo.BetaProductEventRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class BetaMetricsQueryService {

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
        long feedbackSubmitted = feedbackCounts.values().stream().mapToLong(Long::longValue).sum();
        long loginSuccess = counts.getOrDefault("login_success", 0L);
        long loginFailure = counts.getOrDefault("login_failure", 0L);

        return new BetaMetricsSummaryView(
                counts.getOrDefault("ecosystem_home_view", 0L),
                counts.getOrDefault("catalog_view", 0L),
                counts.getOrDefault("map_view", 0L),
                counts.getOrDefault("store_view", 0L),
                counts.getOrDefault("search_used", 0L),
                counts.getOrDefault("product_click", 0L),
                counts.getOrDefault("store_click", 0L),
                counts.getOrDefault("map_pin_click", 0L),
                checkoutStarted,
                counts.getOrDefault("payment_initiated", 0L),
                checkoutSuccess,
                checkoutFailure,
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
}
