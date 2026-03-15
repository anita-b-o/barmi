package com.barmi.domain.fulfillment;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "ecosystem_fulfillments")
public class EcosystemFulfillment {

    @Id
    private UUID id;

    @Column(name = "ecosystem_order_id", nullable = false)
    private UUID ecosystemOrderId;

    @Column(name = "ecosystem_id", nullable = false)
    private UUID ecosystemId;

    @Column(nullable = false)
    private String method;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private FulfillmentStatus status;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    protected EcosystemFulfillment() {}

    public EcosystemFulfillment(
            UUID id,
            UUID ecosystemOrderId,
            UUID ecosystemId,
            String method,
            FulfillmentStatus status
    ) {
        this.id = id;
        this.ecosystemOrderId = ecosystemOrderId;
        this.ecosystemId = ecosystemId;
        this.method = method;
        this.status = status;
    }

    public UUID getId() { return id; }
    public UUID getEcosystemOrderId() { return ecosystemOrderId; }
    public UUID getEcosystemId() { return ecosystemId; }
    public String getMethod() { return method; }
    public FulfillmentStatus getStatus() { return status; }
    public Instant getCreatedAt() { return createdAt; }

    public void changeStatus(FulfillmentStatus next) {
        if (next == null) throw new IllegalArgumentException("status_required");
        if (status == FulfillmentStatus.PENDING) {
            if (next == FulfillmentStatus.DISPATCHED || next == FulfillmentStatus.CANCELLED) {
                status = next;
                return;
            }
        } else if (status == FulfillmentStatus.DISPATCHED) {
            if (next == FulfillmentStatus.DELIVERED) {
                status = next;
                return;
            }
        }
        throw new IllegalStateException("invalid_fulfillment_transition");
    }
}
