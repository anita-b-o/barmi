package com.barmi.domain.saas;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "saas_subscriptions")
public class SaasSubscription {
    @Id
    private UUID id;

    @Column(name = "store_id", nullable = false, unique = true)
    private UUID storeId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "plan_id", nullable = false)
    private SaasPlan plan;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SaasSubscriptionStatus status;

    @Column(name = "started_at", nullable = false)
    private Instant startedAt;

    @Column(name = "expires_at")
    private Instant expiresAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    protected SaasSubscription() {}

    public SaasSubscription(
            UUID id,
            UUID storeId,
            SaasPlan plan,
            SaasSubscriptionStatus status,
            Instant startedAt,
            Instant expiresAt
    ) {
        if (id == null) throw new IllegalArgumentException("id is required");
        if (storeId == null) throw new IllegalArgumentException("storeId is required");
        this.id = id;
        this.storeId = storeId;
        changePlan(plan, status, expiresAt);
        this.startedAt = startedAt == null ? Instant.now() : startedAt;
    }

    public void changePlan(SaasPlan plan, SaasSubscriptionStatus status, Instant expiresAt) {
        if (plan == null) throw new IllegalArgumentException("plan is required");
        if (status == null) throw new IllegalArgumentException("status is required");
        this.plan = plan;
        this.status = status;
        this.expiresAt = expiresAt;
        this.updatedAt = Instant.now();
    }

    @PreUpdate
    void touch() {
        this.updatedAt = Instant.now();
    }

    public UUID getId() { return id; }
    public UUID getStoreId() { return storeId; }
    public SaasPlan getPlan() { return plan; }
    public SaasSubscriptionStatus getStatus() { return status; }
    public Instant getStartedAt() { return startedAt; }
    public Instant getExpiresAt() { return expiresAt; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
