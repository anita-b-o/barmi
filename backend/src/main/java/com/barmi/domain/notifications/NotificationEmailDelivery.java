package com.barmi.domain.notifications;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "notification_email_deliveries")
public class NotificationEmailDelivery {

    @Id
    @Column(name = "idempotency_key", nullable = false)
    private String idempotencyKey;

    @Column(name = "event_id", nullable = false)
    private UUID eventId;

    @Column(name = "template", nullable = false)
    private String template;

    @Column(name = "recipient", nullable = false)
    private String recipient;

    @Column(name = "sent_at", nullable = false)
    private Instant sentAt = Instant.now();

    protected NotificationEmailDelivery() {}

    public NotificationEmailDelivery(String idempotencyKey, UUID eventId, String template, String recipient) {
        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            throw new IllegalArgumentException("idempotencyKey is required");
        }
        if (eventId == null) {
            throw new IllegalArgumentException("eventId is required");
        }
        if (template == null || template.isBlank()) {
            throw new IllegalArgumentException("template is required");
        }
        if (recipient == null || recipient.isBlank()) {
            throw new IllegalArgumentException("recipient is required");
        }
        this.idempotencyKey = idempotencyKey;
        this.eventId = eventId;
        this.template = template;
        this.recipient = recipient;
    }

    public String getIdempotencyKey() { return idempotencyKey; }
    public UUID getEventId() { return eventId; }
    public String getTemplate() { return template; }
    public String getRecipient() { return recipient; }
    public Instant getSentAt() { return sentAt; }
}
