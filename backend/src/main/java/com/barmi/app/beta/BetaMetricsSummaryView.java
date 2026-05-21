package com.barmi.app.beta;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record BetaMetricsSummaryView(
        long homeViews,
        long catalogViews,
        long mapViews,
        long storeViews,
        long searchUses,
        long searchNoResults,
        long productClicks,
        long storeClicks,
        long mapPinClicks,
        long checkoutStarted,
        long paymentInitiated,
        long checkoutSuccess,
        long checkoutFailure,
        long checkoutAbandoned,
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
        List<TopSearchView> topSearches,
        List<FeedbackRouteView> feedbackRoutes,
        List<RecentFeedbackView> recentFeedback,
        List<RecentFailureView> recentFailures
) {
    public record TopStoreView(String storeSlug, String storeName, long views) {
    }

    public record TopSearchView(String query, long uses) {
    }

    public record FeedbackRouteView(String route, long total) {
    }

    public record RecentFeedbackView(
            String category,
            Integer score,
            String message,
            String route,
            String requestId,
            String releaseId,
            Instant createdAt
    ) {
    }

    public record RecentFailureView(
            String eventName,
            String route,
            String requestId,
            String releaseId,
            Instant occurredAt,
            String reason
    ) {
    }
}
