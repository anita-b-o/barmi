package com.barmi.domain.ecosystem;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "ecosystem_external_products")
public class EcosystemExternalProduct {

    @Id
    private UUID id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "ecosystem_id", nullable = false)
    private Ecosystem ecosystem;

    @Column(nullable = false)
    private String name;

    @Column(name = "price_amount", nullable = false, precision = 19, scale = 2)
    private BigDecimal priceAmount;

    @Column(nullable = false)
    private String currency;

    @Column(name = "is_active", nullable = false)
    private boolean active = true;

    @Column(name = "delivery_supported", nullable = false)
    private boolean deliverySupported = true;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    protected EcosystemExternalProduct() {}

    public EcosystemExternalProduct(
            UUID id,
            Ecosystem ecosystem,
            String name,
            BigDecimal priceAmount,
            String currency,
            boolean deliverySupported
    ) {
        if (id == null) throw new IllegalArgumentException("id is required");
        if (ecosystem == null) throw new IllegalArgumentException("ecosystem is required");
        if (name == null || name.isBlank()) throw new IllegalArgumentException("name is required");
        if (priceAmount == null || priceAmount.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("priceAmount must be >= 0");
        }
        if (currency == null || currency.isBlank()) throw new IllegalArgumentException("currency is required");

        this.id = id;
        this.ecosystem = ecosystem;
        this.name = normalizeName(name);
        this.priceAmount = normalizePrice(priceAmount);
        this.currency = normalizeCurrency(currency);
        this.deliverySupported = deliverySupported;
    }

    public void updateName(String name) {
        if (name == null || name.isBlank()) throw new IllegalArgumentException("name is required");
        this.name = normalizeName(name);
    }

    public void updatePriceAmount(BigDecimal priceAmount) {
        if (priceAmount == null || priceAmount.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("priceAmount must be >= 0");
        }
        this.priceAmount = normalizePrice(priceAmount);
    }

    public void updateCurrency(String currency) {
        if (currency == null || currency.isBlank()) throw new IllegalArgumentException("currency is required");
        this.currency = normalizeCurrency(currency);
    }

    public void setActive(boolean active) {
        this.active = active;
    }

    public void setDeliverySupported(boolean deliverySupported) {
        this.deliverySupported = deliverySupported;
    }

    private String normalizeName(String name) {
        return name.trim();
    }

    private String normalizeCurrency(String currency) {
        return currency.trim().toUpperCase();
    }

    private BigDecimal normalizePrice(BigDecimal priceAmount) {
        return priceAmount.setScale(2, RoundingMode.HALF_UP);
    }

    public UUID getId() { return id; }
    public Ecosystem getEcosystem() { return ecosystem; }
    public String getName() { return name; }
    public BigDecimal getPriceAmount() { return priceAmount; }
    public String getCurrency() { return currency; }
    public boolean isActive() { return active; }
    public boolean isDeliverySupported() { return deliverySupported; }
    public Instant getCreatedAt() { return createdAt; }
}
