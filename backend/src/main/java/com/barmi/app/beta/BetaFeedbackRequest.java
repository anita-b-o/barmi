package com.barmi.app.beta;

import java.util.UUID;

public record BetaFeedbackRequest(
        String category,
        Integer score,
        String message,
        String route,
        UUID storeId,
        String storeSlug,
        String ecosystemSlug,
        String requestId,
        String sessionId,
        String releaseId,
        String environment
) {
}
