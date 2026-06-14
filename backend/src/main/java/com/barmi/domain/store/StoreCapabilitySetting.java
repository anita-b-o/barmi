package com.barmi.domain.store;

import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(
        name = "store_capabilities",
        uniqueConstraints = @UniqueConstraint(name = "uk_store_capabilities_store_capability", columnNames = {"store_id", "capability"})
)
public class StoreCapabilitySetting {

    @Id
    private UUID id;

    @Column(name = "store_id", nullable = false)
    private UUID storeId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private StoreCapability capability;

    @Column(nullable = false)
    private boolean enabled;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    protected StoreCapabilitySetting() {}

    public StoreCapabilitySetting(UUID id, UUID storeId, StoreCapability capability, boolean enabled) {
        this.id = id;
        this.storeId = storeId;
        this.capability = capability;
        this.enabled = enabled;
    }

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        if (createdAt == null) {
            createdAt = now;
        }
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public UUID getId() { return id; }
    public UUID getStoreId() { return storeId; }
    public StoreCapability getCapability() { return capability; }
    public boolean isEnabled() { return enabled; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
