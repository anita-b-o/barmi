package com.barmi.domain.payments;

import com.barmi.domain.enums.PaymentScope;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "payments")
public class Payment {

    @Id
    private UUID id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PaymentScope scope;

    @Column(name = "operation_id", nullable = false)
    private UUID operationId;

    @Column(nullable = false)
    private String provider;

    @Column(name = "provider_payment_id", nullable = false)
    private String providerPaymentId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PaymentStatus status;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false)
    private String currency;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "confirmed_at")
    private Instant confirmedAt;

    protected Payment() {}

    public Payment(
            UUID id,
            PaymentScope scope,
            UUID operationId,
            String provider,
            String providerPaymentId,
            PaymentStatus status,
            BigDecimal amount,
            String currency
    ) {
        this.id = id;
        this.scope = scope;
        this.operationId = operationId;
        this.provider = provider;
        this.providerPaymentId = providerPaymentId;
        this.status = status;
        this.amount = amount;
        this.currency = currency;
    }

    public UUID getId() { return id; }
    public PaymentScope getScope() { return scope; }
    public UUID getOperationId() { return operationId; }
    public String getProvider() { return provider; }
    public String getProviderPaymentId() { return providerPaymentId; }
    public PaymentStatus getStatus() { return status; }
    public BigDecimal getAmount() { return amount; }
    public String getCurrency() { return currency; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getConfirmedAt() { return confirmedAt; }

    public void markConfirmed() {
        this.status = PaymentStatus.CONFIRMED;
        this.confirmedAt = Instant.now();
    }
}
