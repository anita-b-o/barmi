package com.barmi.domain.ecosystem;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "ecosystem_promotions")
public class EcosystemPromotion {
    @Id
    private UUID id;

    @Column(name = "ecosystem_id", nullable = false)
    private UUID ecosystemId;

    @Column(nullable = false)
    private String code;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EcosystemPromotionType type;

    @Column(name = "value_amount", nullable = false, precision = 19, scale = 2)
    private BigDecimal valueAmount;

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "expiration_date")
    private Instant expirationDate;

    @Column(name = "usage_limit")
    private Long usageLimit;

    @Column(name = "usage_count", nullable = false)
    private long usageCount;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    protected EcosystemPromotion() {}

    public EcosystemPromotion(
            UUID id,
            UUID ecosystemId,
            String code,
            EcosystemPromotionType type,
            BigDecimal valueAmount,
            boolean active,
            Instant expirationDate,
            Long usageLimit
    ) {
        this.id = id;
        this.ecosystemId = ecosystemId;
        this.code = code;
        this.type = type;
        this.valueAmount = valueAmount;
        this.active = active;
        this.expirationDate = expirationDate;
        this.usageLimit = usageLimit;
        this.usageCount = 0;
    }

    public UUID getId() { return id; }
    public UUID getEcosystemId() { return ecosystemId; }
    public String getCode() { return code; }
    public EcosystemPromotionType getType() { return type; }
    public BigDecimal getValueAmount() { return valueAmount; }
    public boolean isActive() { return active; }
    public Instant getExpirationDate() { return expirationDate; }
    public Long getUsageLimit() { return usageLimit; }
    public long getUsageCount() { return usageCount; }
    public Instant getCreatedAt() { return createdAt; }

    public void setActive(boolean active) {
        this.active = active;
    }

    public void incrementUsage() {
        this.usageCount += 1;
    }
}
