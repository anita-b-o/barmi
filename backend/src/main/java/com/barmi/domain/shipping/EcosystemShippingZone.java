package com.barmi.domain.shipping;

import com.barmi.domain.ecosystem.Ecosystem;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "ecosystem_shipping_zones")
public class EcosystemShippingZone {

    @Id
    private UUID id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "ecosystem_id", nullable = false)
    private Ecosystem ecosystem;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EcosystemShippingZoneType type;

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

    @Column(name = "is_active", nullable = false)
    private boolean active = true;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    protected EcosystemShippingZone() {}

    public EcosystemShippingZone(
            UUID id,
            Ecosystem ecosystem,
            EcosystemShippingZoneType type,
            String postalCode,
            Integer rangeStart,
            Integer rangeEnd,
            BigDecimal costAmount,
            String currency
    ) {
        if (id == null) throw new IllegalArgumentException("id is required");
        if (ecosystem == null) throw new IllegalArgumentException("ecosystem is required");
        if (type == null) throw new IllegalArgumentException("type is required");
        if (costAmount == null || costAmount.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("costAmount must be >= 0");
        }
        if (currency == null || currency.isBlank()) throw new IllegalArgumentException("currency is required");

        if (type == EcosystemShippingZoneType.EXACT) {
            if (postalCode == null || postalCode.isBlank()) {
                throw new IllegalArgumentException("postalCode is required for EXACT");
            }
            if (rangeStart != null || rangeEnd != null) {
                throw new IllegalArgumentException("range fields must be null for EXACT");
            }
        }

        if (type == EcosystemShippingZoneType.RANGE) {
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
        this.ecosystem = ecosystem;
        this.type = type;
        this.postalCode = postalCode;
        this.rangeStart = rangeStart;
        this.rangeEnd = rangeEnd;
        this.costAmount = costAmount;
        this.currency = currency;
    }

    public UUID getId() { return id; }
    public Ecosystem getEcosystem() { return ecosystem; }
    public EcosystemShippingZoneType getType() { return type; }
    public String getPostalCode() { return postalCode; }
    public Integer getRangeStart() { return rangeStart; }
    public Integer getRangeEnd() { return rangeEnd; }
    public BigDecimal getCostAmount() { return costAmount; }
    public String getCurrency() { return currency; }
    public boolean isActive() { return active; }
    public Instant getCreatedAt() { return createdAt; }

    public void setActive(boolean active) {
        this.active = active;
    }
}
