package com.barmi.domain.events;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "outbox_events")
public class OutboxEvent {

    @Id
    @Column(name = "event_id")
    private UUID eventId;

    @Column(name = "event_type", nullable = false)
    private String eventType;

    @Column(nullable = false)
    private String scope; // STORE|ECOSYSTEM|RESERVATION

    @Column(name = "aggregate_id")
    private UUID aggregateId;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "payload_json", nullable = false, columnDefinition = "jsonb")
    private String payloadJson;

    @Column(name = "occurred_at", nullable = false)
    private Instant occurredAt = Instant.now();

    @Column(name = "published_at")
    private Instant publishedAt;

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

    public void markPublishedNow() {
        this.publishedAt = Instant.now();
    }
}
