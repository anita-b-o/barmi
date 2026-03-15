package com.barmi.domain.shipping;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "store_shipping_zones")
public class StoreShippingZone {

    @Id
    private UUID id;

    @Column(name = "store_id", nullable = false)
    private UUID storeId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ShippingZoneType type;

    @Column(name = "postal_code")
    private String postalCode;

    @Column(name = "range_start")
    private Integer rangeStart;

    @Column(name = "range_end")
    private Integer rangeEnd;

    @Column(name = "cost_amount", nullable = false, precision = 19, scale = 2)
    private BigDecimal costAmount;

    @Column(nullable = false)
    private String currency;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    protected StoreShippingZone() {}

    public StoreShippingZone(
            UUID id,
            UUID storeId,
            ShippingZoneType type,
            String postalCode,
            Integer rangeStart,
            Integer rangeEnd,
            BigDecimal costAmount,
            String currency
    ) {
        if (id == null) throw new IllegalArgumentException("id is required");
        if (storeId == null) throw new IllegalArgumentException("storeId is required");
        if (type == null) throw new IllegalArgumentException("type is required");
        if (costAmount == null || costAmount.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("costAmount must be >= 0");
        }
        if (currency == null || currency.isBlank()) throw new IllegalArgumentException("currency is required");

        if (type == ShippingZoneType.EXACT) {
            if (postalCode == null || postalCode.isBlank()) {
                throw new IllegalArgumentException("postalCode is required for EXACT");
            }
            if (rangeStart != null || rangeEnd != null) {
                throw new IllegalArgumentException("range fields must be null for EXACT");
            }
        }

        if (type == ShippingZoneType.RANGE) {
            if (postalCode != null) {
                throw new IllegalArgumentException("postalCode must be null for RANGE");
            }
            if (rangeStart == null || rangeEnd == null) {
                throw new IllegalArgumentException("rangeStart and rangeEnd are required for RANGE");
            }
            if (rangeStart > rangeEnd) {
                throw new IllegalArgumentException("rangeStart must be <= rangeEnd");
            }
        }

        this.id = id;
        this.storeId = storeId;
        this.type = type;
        this.postalCode = postalCode;
        this.rangeStart = rangeStart;
        this.rangeEnd = rangeEnd;
        this.costAmount = costAmount;
        this.currency = currency;
    }

    public UUID getId() { return id; }
    public UUID getStoreId() { return storeId; }
    public ShippingZoneType getType() { return type; }
    public String getPostalCode() { return postalCode; }
    public Integer getRangeStart() { return rangeStart; }
    public Integer getRangeEnd() { return rangeEnd; }
    public BigDecimal getCostAmount() { return costAmount; }
    public String getCurrency() { return currency; }
    public Instant getCreatedAt() { return createdAt; }
}
