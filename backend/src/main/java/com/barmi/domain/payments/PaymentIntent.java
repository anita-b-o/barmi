package com.barmi.domain.payments;

import com.barmi.domain.enums.PaymentScope;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "payment_intents")
public class PaymentIntent {

    @Id
    private UUID id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PaymentScope scope;

    @Column(name = "store_order_id")
    private UUID storeOrderId;

    @Column(name = "store_id")
    private UUID storeId;

    @Column(name = "ecosystem_order_id")
    private UUID ecosystemOrderId;

    @Column(name = "ecosystem_id")
    private UUID ecosystemId;

    @Column(nullable = false)
    private String provider;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PaymentStatus status;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false)
    private String currency;

    @Column(name = "provider_preference_id")
    private String providerPreferenceId;

    @Column(name = "checkout_url", nullable = false)
    private String checkoutUrl;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at")
    private Instant updatedAt;

    protected PaymentIntent() {}

    public PaymentIntent(
            UUID id,
            PaymentScope scope,
            UUID storeOrderId,
            UUID storeId,
            UUID ecosystemOrderId,
            UUID ecosystemId,
            String provider,
            PaymentStatus status,
            BigDecimal amount,
            String currency,
            String providerPreferenceId,
            String checkoutUrl
    ) {
        this.id = id;
        this.scope = scope;
        this.storeOrderId = storeOrderId;
        this.storeId = storeId;
        this.ecosystemOrderId = ecosystemOrderId;
        this.ecosystemId = ecosystemId;
        this.provider = provider;
        this.status = status;
        this.amount = amount;
        this.currency = currency;
        this.providerPreferenceId = providerPreferenceId;
        this.checkoutUrl = checkoutUrl;
    }

    @PreUpdate
    void touchUpdatedAt() {
        this.updatedAt = Instant.now();
    }

    public UUID getId() { return id; }
    public PaymentScope getScope() { return scope; }
    public UUID getStoreOrderId() { return storeOrderId; }
    public UUID getStoreId() { return storeId; }
    public UUID getEcosystemOrderId() { return ecosystemOrderId; }
    public UUID getEcosystemId() { return ecosystemId; }
    public String getProvider() { return provider; }
    public PaymentStatus getStatus() { return status; }
    public BigDecimal getAmount() { return amount; }
    public String getCurrency() { return currency; }
    public String getProviderPreferenceId() { return providerPreferenceId; }
    public String getCheckoutUrl() { return checkoutUrl; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
