package com.barmi.domain.ecosystem;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "external_products",
       uniqueConstraints = @UniqueConstraint(columnNames = {"provider_id", "provider_sku"}))
public class ExternalProduct {

    @Id
    private UUID id;

    @Column(name = "provider_id", nullable = false)
    private String providerId;

    @Column(name = "provider_sku", nullable = false)
    private String providerSku;

    @Column(nullable = false)
    private String name;

    @Column(name = "price_cents", nullable = false)
    private long priceCents;

    @Column(name = "is_active", nullable = false)
    private boolean active = true;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    protected ExternalProduct() {}

    public ExternalProduct(UUID id, String providerId, String providerSku, String name, long priceCents) {
        this.id = id;
        this.providerId = providerId;
        this.providerSku = providerSku;
        this.name = name;
        this.priceCents = priceCents;
    }

    public UUID getId() { return id; }
    public String getProviderId() { return providerId; }
    public String getProviderSku() { return providerSku; }
    public String getName() { return name; }
    public long getPriceCents() { return priceCents; }
    public boolean isActive() { return active; }
    public Instant getCreatedAt() { return createdAt; }
}
