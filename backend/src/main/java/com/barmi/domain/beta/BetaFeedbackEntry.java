package com.barmi.domain.beta;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "beta_feedback_entries")
public class BetaFeedbackEntry {

    @Id
    private UUID id;

    @Column(name = "category", nullable = false)
    private String category;

    @Column(name = "score")
    private Integer score;

    @Column(name = "message", nullable = false)
    private String message;

    @Column(name = "route", nullable = false)
    private String route;

    @Column(name = "store_id")
    private UUID storeId;

    @Column(name = "store_slug")
    private String storeSlug;

    @Column(name = "ecosystem_slug")
    private String ecosystemSlug;

    @Column(name = "request_id")
    private String requestId;

    @Column(name = "session_id", nullable = false)
    private String sessionId;

    @Column(name = "release_id", nullable = false)
    private String releaseId;

    @Column(name = "environment", nullable = false)
    private String environment;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    protected BetaFeedbackEntry() {
    }

    public BetaFeedbackEntry(
            UUID id,
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
        this.id = id;
        this.category = category;
        this.score = score;
        this.message = message;
        this.route = route;
        this.storeId = storeId;
        this.storeSlug = storeSlug;
        this.ecosystemSlug = ecosystemSlug;
        this.requestId = requestId;
        this.sessionId = sessionId;
        this.releaseId = releaseId;
        this.environment = environment;
    }
}
