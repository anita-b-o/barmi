package com.barmi.domain.events;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "outbox_events")
public class OutboxEvent {
    public static final String STATUS_PENDING = "PENDING";
    public static final String STATUS_PROCESSING = "PROCESSING";
    public static final String STATUS_PUBLISHED = "PUBLISHED";
    public static final String STATUS_FAILED = "FAILED";
    private static final int LAST_ERROR_MAX_LENGTH = 2000;

    @Id
    @Column(name = "event_id")
    private UUID eventId;

    @Column(name = "event_type", nullable = false)
    private String eventType;

    @Column(nullable = false)
    private String scope; // STORE|ECOSYSTEM

    @Column(name = "aggregate_id")
    private UUID aggregateId;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "payload_json", nullable = false, columnDefinition = "jsonb")
    private String payloadJson;

    @Column(name = "occurred_at", nullable = false)
    private Instant occurredAt = Instant.now();

    @Column(name = "published_at")
    private Instant publishedAt;

    @Column(nullable = false)
    private String status = STATUS_PENDING;

    @Column(name = "attempt_count", nullable = false)
    private int attemptCount;

    @Column(name = "next_attempt_at", nullable = false)
    private Instant nextAttemptAt = Instant.now();

    @Column(name = "claimed_at")
    private Instant claimedAt;

    @Column(name = "claimed_by")
    private String claimedBy;

    @Column(name = "last_attempt_at")
    private Instant lastAttemptAt;

    @Column(name = "last_error", length = LAST_ERROR_MAX_LENGTH)
    private String lastError;

    @Column(name = "failed_at")
    private Instant failedAt;

    protected OutboxEvent() {}

    public OutboxEvent(UUID eventId, String eventType, String scope, UUID aggregateId, String payloadJson) {
        this.eventId = eventId;
        this.eventType = eventType;
        this.scope = scope;
        this.aggregateId = aggregateId;
        this.payloadJson = payloadJson;
    }

    public UUID getEventId() { return eventId; }
    public String getEventType() { return eventType; }
    public String getScope() { return scope; }
    public UUID getAggregateId() { return aggregateId; }
    public String getPayloadJson() { return payloadJson; }
    public Instant getOccurredAt() { return occurredAt; }
    public Instant getPublishedAt() { return publishedAt; }
    public String getStatus() { return status; }
    public int getAttemptCount() { return attemptCount; }
    public Instant getNextAttemptAt() { return nextAttemptAt; }
    public Instant getClaimedAt() { return claimedAt; }
    public String getClaimedBy() { return claimedBy; }
    public Instant getLastAttemptAt() { return lastAttemptAt; }
    public String getLastError() { return lastError; }
    public Instant getFailedAt() { return failedAt; }

    public void markClaimed(String instanceId) {
        Instant now = Instant.now();
        this.status = STATUS_PROCESSING;
        this.claimedAt = now;
        this.claimedBy = instanceId;
        this.lastAttemptAt = now;
    }

    public void markPublishedNow() {
        this.publishedAt = Instant.now();
        this.status = STATUS_PUBLISHED;
        this.claimedAt = null;
        this.claimedBy = null;
        this.lastError = null;
        this.failedAt = null;
    }

    public void markRetryScheduled(String error, Instant nextAttemptAt) {
        this.attemptCount += 1;
        this.status = STATUS_PENDING;
        this.nextAttemptAt = nextAttemptAt;
        this.claimedAt = null;
        this.claimedBy = null;
        this.lastError = truncateError(error);
        this.failedAt = null;
    }

    public void markFailed(String error) {
        this.attemptCount += 1;
        this.status = STATUS_FAILED;
        this.claimedAt = null;
        this.claimedBy = null;
        this.lastError = truncateError(error);
        this.failedAt = Instant.now();
    }

    private String truncateError(String error) {
        if (error == null || error.isBlank()) {
            return null;
        }
        String normalized = error.trim();
        if (normalized.length() <= LAST_ERROR_MAX_LENGTH) {
            return normalized;
        }
        return normalized.substring(0, LAST_ERROR_MAX_LENGTH);
    }
}
