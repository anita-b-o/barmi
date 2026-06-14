package com.barmi.app.beta;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

public record BetaTelemetryIngestRequest(
        String eventName,
        UUID storeId,
        String storeSlug,
        String storeName,
        String ecosystemSlug,
        String productId,
        String productSlug,
        String searchTerm,
        String requestId,
        String sessionId,
        String route,
        String releaseId,
        String environment,
        Instant occurredAt,
        Map<String, String> metadata
) {
}
