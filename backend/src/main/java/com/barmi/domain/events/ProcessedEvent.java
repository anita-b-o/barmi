package com.barmi.domain.events;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "processed_events")
public class ProcessedEvent {
    @Id
    @Column(name = "event_id")
    private UUID eventId;

    @Column(name = "processed_at", nullable = false)
    private Instant processedAt = Instant.now();

    protected ProcessedEvent() {}

    public ProcessedEvent(UUID eventId) {
        this.eventId = eventId;
    }

    public UUID getEventId() { return eventId; }
    public Instant getProcessedAt() { return processedAt; }
}
