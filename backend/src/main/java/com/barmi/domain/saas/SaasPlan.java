package com.barmi.domain.saas;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "saas_plans")
public class SaasPlan {
    @Id
    private UUID id;

    @Column(nullable = false, unique = true)
    private String code;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private boolean active = true;

    @Column
    private String description;

    @Column(name = "max_products", nullable = false)
    private int maxProducts;

    @Column(name = "analytics_enabled", nullable = false)
    private boolean analyticsEnabled;

    @Column(name = "seo_enabled", nullable = false)
    private boolean seoEnabled;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    protected SaasPlan() {}

    public SaasPlan(
            UUID id,
            String code,
            String name,
            boolean active,
            String description,
            int maxProducts,
            boolean analyticsEnabled,
            boolean seoEnabled
    ) {
        if (id == null) throw new IllegalArgumentException("id is required");
        this.id = id;
        this.code = normalizeCode(code);
        update(name, active, description, maxProducts, analyticsEnabled, seoEnabled);
    }

    public void update(
            String name,
            boolean active,
            String description,
            int maxProducts,
            boolean analyticsEnabled,
            boolean seoEnabled
    ) {
        if (name == null || name.isBlank()) throw new IllegalArgumentException("name is required");
        if (maxProducts < 0) throw new IllegalArgumentException("maxProducts must be non-negative");
        this.name = name.trim();
        this.active = active;
        this.description = description == null || description.isBlank() ? null : description.trim();
        this.maxProducts = maxProducts;
        this.analyticsEnabled = analyticsEnabled;
        this.seoEnabled = seoEnabled;
        this.updatedAt = Instant.now();
    }

    @PreUpdate
    void touch() {
        this.updatedAt = Instant.now();
    }

    private String normalizeCode(String value) {
        if (value == null || value.isBlank()) throw new IllegalArgumentException("code is required");
        return value.trim().toUpperCase();
    }

    public UUID getId() { return id; }
    public String getCode() { return code; }
    public String getName() { return name; }
    public boolean isActive() { return active; }
    public String getDescription() { return description; }
    public int getMaxProducts() { return maxProducts; }
    public boolean isAnalyticsEnabled() { return analyticsEnabled; }
    public boolean isSeoEnabled() { return seoEnabled; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
