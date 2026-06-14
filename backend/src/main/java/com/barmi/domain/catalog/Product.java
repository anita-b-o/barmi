package com.barmi.domain.catalog;

import jakarta.persistence.*;
import java.text.Normalizer;
import java.time.Instant;
import java.util.Locale;
import java.util.UUID;

@Entity
@Table(name = "products",
       uniqueConstraints = @UniqueConstraint(columnNames = {"store_id", "sku"}))
public class Product {
    public static final long DEFAULT_LEGACY_STOCK_QUANTITY = 999_999L;

    @Id
    private UUID id;

    @Column(name = "store_id", nullable = false)
    private UUID storeId;

    @Column(nullable = false)
    private String sku;

    @Column(nullable = false)
    private String name;

    @Column(name = "public_slug", nullable = false)
    private String publicSlug;

    @Column(name = "price_cents", nullable = false)
    private long priceCents;

    @Column(name = "stock_quantity", nullable = false)
    private long stockQuantity = DEFAULT_LEGACY_STOCK_QUANTITY;

    @Column(name = "category_id")
    private UUID categoryId;

    @Column(name = "is_active", nullable = false)
    private boolean active = true;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    protected Product() {}

    public Product(UUID id, UUID storeId, String sku, String name, long priceCents) {
        this(id, storeId, sku, name, priceCents, DEFAULT_LEGACY_STOCK_QUANTITY);
    }

    public Product(UUID id, UUID storeId, String sku, String name, long priceCents, long stockQuantity) {
        this(id, storeId, sku, name, priceCents, stockQuantity, null);
    }

    public Product(UUID id, UUID storeId, String sku, String name, long priceCents, long stockQuantity, UUID categoryId) {
        this.id = id;
        this.storeId = storeId;
        this.sku = sku;
        this.name = name;
        this.publicSlug = buildDefaultPublicSlug(name, id);
        this.priceCents = priceCents;
        this.stockQuantity = stockQuantity;
        this.categoryId = categoryId;
    }

    public void updateSku(String sku) { this.sku = sku; }
    public void updateName(String name) { this.name = name; }
    public void updatePublicSlug(String publicSlug) { this.publicSlug = normalizePublicSlug(publicSlug); }
    public void updatePriceCents(long priceCents) { this.priceCents = priceCents; }
    public void updateStockQuantity(long stockQuantity) { this.stockQuantity = stockQuantity; }
    public void updateCategoryId(UUID categoryId) { this.categoryId = categoryId; }
    public void setActive(boolean active) { this.active = active; }

    public UUID getId() { return id; }
    public UUID getStoreId() { return storeId; }
    public String getSku() { return sku; }
    public String getName() { return name; }
    public String getPublicSlug() { return publicSlug; }
    public long getPriceCents() { return priceCents; }
    public long getStockQuantity() { return stockQuantity; }
    public UUID getCategoryId() { return categoryId; }
    public boolean isActive() { return active; }
    public boolean isAvailable() { return active && stockQuantity > 0; }
    public Instant getCreatedAt() { return createdAt; }

    public static String buildBasePublicSlug(String value) {
        if (value == null) {
            return "product";
        }
        String normalized = Normalizer.normalize(value.trim(), Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("(^-+|-+$)", "");
        return normalized.isBlank() ? "product" : normalized;
    }

    public static String buildDefaultPublicSlug(String name, UUID id) {
        String baseSlug = buildBasePublicSlug(name);
        if (id == null) {
            return baseSlug;
        }
        String normalizedId = id.toString().replace("-", "");
        return baseSlug + "-" + normalizedId.substring(normalizedId.length() - 12);
    }

    private String normalizePublicSlug(String publicSlug) {
        String normalized = buildBasePublicSlug(publicSlug);
        if (normalized.isBlank()) {
            throw new IllegalArgumentException("publicSlug is required");
        }
        return normalized;
    }
}
