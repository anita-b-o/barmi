package com.barmi.domain.catalog;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "products",
       uniqueConstraints = @UniqueConstraint(columnNames = {"store_id", "sku"}))
public class Product {

    @Id
    private UUID id;

    @Column(name = "store_id", nullable = false)
    private UUID storeId;

    @Column(nullable = false)
    private String sku;

    @Column(nullable = false)
    private String name;

    @Column(name = "price_cents", nullable = false)
    private long priceCents;

    @Column(name = "is_active", nullable = false)
    private boolean active = true;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    protected Product() {}

    public Product(UUID id, UUID storeId, String sku, String name, long priceCents) {
        this.id = id;
        this.storeId = storeId;
        this.sku = sku;
        this.name = name;
        this.priceCents = priceCents;
    }

    public UUID getId() { return id; }
    public UUID getStoreId() { return storeId; }
    public String getSku() { return sku; }
    public String getName() { return name; }
    public long getPriceCents() { return priceCents; }
    public boolean isActive() { return active; }
    public Instant getCreatedAt() { return createdAt; }
}
