package com.barmi.domain.beta;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "beta_product_events")
public class BetaProductEvent {

    @Id
    private UUID id;

    @Column(name = "event_name", nullable = false)
    private String eventName;

    @Column(name = "event_category", nullable = false)
    private String eventCategory;

    @Column(name = "store_id")
    private UUID storeId;

    @Column(name = "store_slug")
    private String storeSlug;

    @Column(name = "store_name")
    private String storeName;

    @Column(name = "ecosystem_slug")
    private String ecosystemSlug;

    @Column(name = "product_id")
    private String productId;

    @Column(name = "search_term")
    private String searchTerm;

    @Column(name = "request_id")
    private String requestId;

    @Column(name = "session_id", nullable = false)
    private String sessionId;

    @Column(name = "route", nullable = false)
    private String route;

    @Column(name = "release_id", nullable = false)
    private String releaseId;

    @Column(name = "environment", nullable = false)
    private String environment;

    @Column(name = "metadata_json", nullable = false)
    private String metadataJson;

    @Column(name = "occurred_at", nullable = false)
    private Instant occurredAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    protected BetaProductEvent() {
    }

    public BetaProductEvent(
            UUID id,
            String eventName,
            String eventCategory,
            UUID storeId,
            String storeSlug,
            String storeName,
            String ecosystemSlug,
            String productId,
            String searchTerm,
            String requestId,
            String sessionId,
            String route,
            String releaseId,
            String environment,
            String metadataJson,
            Instant occurredAt
    ) {
        this.id = id;
        this.eventName = eventName;
        this.eventCategory = eventCategory;
        this.storeId = storeId;
        this.storeSlug = storeSlug;
        this.storeName = storeName;
        this.ecosystemSlug = ecosystemSlug;
        this.productId = productId;
        this.searchTerm = searchTerm;
        this.requestId = requestId;
        this.sessionId = sessionId;
        this.route = route;
        this.releaseId = releaseId;
        this.environment = environment;
        this.metadataJson = metadataJson;
        this.occurredAt = occurredAt;
    }
}
