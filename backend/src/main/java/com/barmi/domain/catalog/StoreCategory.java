package com.barmi.domain.catalog;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "store_categories")
public class StoreCategory {

    @Id
    private UUID id;

    @Column(name = "store_id", nullable = false)
    private UUID storeId;

    @Column(nullable = false)
    private String name;

    @Column(name = "is_active", nullable = false)
    private boolean active = true;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder = 0;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    protected StoreCategory() {}

    public StoreCategory(UUID id, UUID storeId, String name, boolean active, int sortOrder) {
        this.id = id;
        this.storeId = storeId;
        this.name = name;
        this.active = active;
        this.sortOrder = sortOrder;
    }

    public void updateName(String name) { this.name = name; }
    public void setActive(boolean active) { this.active = active; }
    public void updateSortOrder(int sortOrder) { this.sortOrder = sortOrder; }

    public UUID getId() { return id; }
    public UUID getStoreId() { return storeId; }
    public String getName() { return name; }
    public boolean isActive() { return active; }
    public int getSortOrder() { return sortOrder; }
    public Instant getCreatedAt() { return createdAt; }
}
