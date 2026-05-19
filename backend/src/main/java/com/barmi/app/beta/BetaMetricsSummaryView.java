package com.barmi.app.beta;

import java.math.BigDecimal;
import java.util.List;

public record BetaMetricsSummaryView(
        long homeViews,
        long catalogViews,
        long mapViews,
        long storeViews,
        long searchUses,
        long productClicks,
        long storeClicks,
        long mapPinClicks,
        long checkoutStarted,
        long paymentInitiated,
        long checkoutSuccess,
        long checkoutFailure,
        BigDecimal checkoutSuccessRate,
        long loginSuccess,
        long loginFailure,
        BigDecimal loginFailureRate,
        long feedbackSubmitted,
        long feedbackBug,
        long feedbackConfusing,
        long feedbackMissing,
        long feedbackLoveIt,
        List<TopStoreView> topStores,
        List<TopSearchView> topSearches
) {
    public record TopStoreView(String storeSlug, String storeName, long views) {
    }

    public record TopSearchView(String query, long uses) {
    }
}
