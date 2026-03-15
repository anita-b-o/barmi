package com.barmi.domain.fulfillment;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "store_fulfillments")
public class StoreFulfillment {

    @Id
    private UUID id;

    @Column(name = "store_order_id", nullable = false)
    private UUID storeOrderId;

    @Column(name = "store_id", nullable = false)
    private UUID storeId;

    @Column(nullable = false)
    private String method;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private FulfillmentStatus status;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    protected StoreFulfillment() {}

    public StoreFulfillment(UUID id, UUID storeOrderId, UUID storeId, String method, FulfillmentStatus status) {
        this.id = id;
        this.storeOrderId = storeOrderId;
        this.storeId = storeId;
        this.method = method;
        this.status = status;
    }

    public UUID getId() { return id; }
    public UUID getStoreOrderId() { return storeOrderId; }
    public UUID getStoreId() { return storeId; }
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
