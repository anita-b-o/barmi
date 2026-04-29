package com.barmi.domain.orders;

import com.barmi.domain.ecosystem.Ecosystem;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "ecosystem_orders")
public class EcosystemOrder {
    @Id
    private UUID id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "ecosystem_id", nullable = false)
    private Ecosystem ecosystem;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EcosystemOrderStatus status;

    @Column(nullable = false)
    private String currency;

    @Column(name = "subtotal_amount", nullable = false, precision = 19, scale = 2)
    private BigDecimal subtotalAmount;

    @Column(name = "shipping_cost_amount", nullable = false, precision = 19, scale = 2)
    private BigDecimal shippingCostAmount = BigDecimal.ZERO;

    @Column(name = "shipping_currency", nullable = false)
    private String shippingCurrency = "";

    @Column(name = "shipping_zone_id")
    private UUID shippingZoneId;

    @Column(name = "shipping_postal_code")
    private String shippingPostalCode;

    @Column(name = "original_amount", nullable = false, precision = 19, scale = 2)
    private BigDecimal originalAmount = BigDecimal.ZERO;

    @Column(name = "discount_amount", nullable = false, precision = 19, scale = 2)
    private BigDecimal discountAmount = BigDecimal.ZERO;

    @Column(name = "applied_promotion_id")
    private UUID appliedPromotionId;

    @Column(name = "applied_coupon_code")
    private String appliedCouponCode;

    @Column(name = "promotion_consumed_at")
    private Instant promotionConsumedAt;

    @Column(name = "total_amount", nullable = false, precision = 19, scale = 2)
    private BigDecimal totalAmount;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @OneToMany(mappedBy = "ecosystemOrder", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<EcosystemOrderItem> items = new ArrayList<>();

    protected EcosystemOrder() {}

    private EcosystemOrder(
            UUID id,
            Ecosystem ecosystem,
            EcosystemOrderStatus status,
            String currency,
            BigDecimal subtotalAmount,
            BigDecimal shippingCostAmount,
            String shippingCurrency,
            UUID shippingZoneId,
            String shippingPostalCode,
            BigDecimal originalAmount,
            BigDecimal discountAmount,
            UUID appliedPromotionId,
            String appliedCouponCode,
            BigDecimal totalAmount
    ) {
        this.id = id;
        this.ecosystem = ecosystem;
        this.status = status;
        this.currency = currency;
        this.subtotalAmount = subtotalAmount;
        this.shippingCostAmount = shippingCostAmount;
        this.shippingCurrency = shippingCurrency;
        this.shippingZoneId = shippingZoneId;
        this.shippingPostalCode = shippingPostalCode;
        this.originalAmount = originalAmount;
        this.discountAmount = discountAmount;
        this.appliedPromotionId = appliedPromotionId;
        this.appliedCouponCode = appliedCouponCode;
        this.totalAmount = totalAmount;
    }

    public static EcosystemOrder create(
            UUID id,
            Ecosystem ecosystem,
            String currency,
            BigDecimal subtotalAmount,
            BigDecimal shippingCostAmount,
            String shippingCurrency,
            UUID shippingZoneId,
            String shippingPostalCode,
            BigDecimal totalAmount,
            List<EcosystemOrderItem> items
    ) {
        return create(
                id,
                ecosystem,
                currency,
                subtotalAmount,
                shippingCostAmount,
                shippingCurrency,
                shippingZoneId,
                shippingPostalCode,
                totalAmount,
                BigDecimal.ZERO,
                null,
                null,
                totalAmount,
                items
        );
    }

    public static EcosystemOrder create(
            UUID id,
            Ecosystem ecosystem,
            String currency,
            BigDecimal subtotalAmount,
            BigDecimal shippingCostAmount,
            String shippingCurrency,
            UUID shippingZoneId,
            String shippingPostalCode,
            BigDecimal originalAmount,
            BigDecimal discountAmount,
            UUID appliedPromotionId,
            String appliedCouponCode,
            BigDecimal totalAmount,
            List<EcosystemOrderItem> items
    ) {
        if (id == null) throw new IllegalArgumentException("id is required");
        if (ecosystem == null) throw new IllegalArgumentException("ecosystem is required");
        if (currency == null || currency.isBlank()) throw new IllegalArgumentException("currency is required");
        if (subtotalAmount == null || subtotalAmount.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("subtotalAmount must be >= 0");
        }
        if (totalAmount == null || totalAmount.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("totalAmount must be >= 0");
        }
        if (shippingCostAmount == null || shippingCostAmount.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("shippingCostAmount must be >= 0");
        }
        if (originalAmount == null || originalAmount.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("originalAmount must be >= 0");
        }
        if (discountAmount == null || discountAmount.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("discountAmount must be >= 0");
        }
        if (originalAmount.subtract(discountAmount).compareTo(totalAmount) != 0) {
            throw new IllegalStateException("discount_total_mismatch");
        }
        if (shippingCostAmount.compareTo(BigDecimal.ZERO) > 0) {
            if (shippingZoneId == null || shippingPostalCode == null || shippingPostalCode.isBlank()) {
                throw new IllegalArgumentException("shipping snapshot required when shippingCostAmount > 0");
            }
            if (shippingCurrency == null || shippingCurrency.isBlank()) {
                throw new IllegalArgumentException("shippingCurrency is required when shippingCostAmount > 0");
            }
        } else {
            if (shippingZoneId != null || (shippingPostalCode != null && !shippingPostalCode.isBlank())) {
                throw new IllegalArgumentException("shipping snapshot required when shippingCostAmount > 0");
            }
            if (shippingCurrency != null && !shippingCurrency.isBlank()) {
                throw new IllegalArgumentException("shippingCurrency is required when shippingCostAmount > 0");
            }
        }
        if (items == null || items.isEmpty()) throw new IllegalArgumentException("items are required");
        for (EcosystemOrderItem item : items) {
            if (item == null) throw new IllegalArgumentException("item cannot be null");
        }

        EcosystemOrder order = new EcosystemOrder(
                id,
                ecosystem,
                EcosystemOrderStatus.PENDING_PAYMENT,
                currency,
                subtotalAmount,
                shippingCostAmount,
                shippingCurrency == null ? "" : shippingCurrency,
                shippingZoneId,
                shippingPostalCode,
                originalAmount,
                discountAmount,
                appliedPromotionId,
                appliedCouponCode,
                totalAmount
        );
        order.addItems(items);
        return order;
    }

    public void markPaid() {
        if (status != EcosystemOrderStatus.PENDING_PAYMENT) {
            throw new IllegalStateException("Only PENDING_PAYMENT orders can be marked as PAID");
        }
        this.status = EcosystemOrderStatus.PAID;
    }

    public void cancel() {
        if (status != EcosystemOrderStatus.PENDING_PAYMENT) {
            throw new IllegalStateException("Only PENDING_PAYMENT orders can be cancelled");
        }
        this.status = EcosystemOrderStatus.CANCELLED;
    }

    private void addItems(List<EcosystemOrderItem> items) {
        for (EcosystemOrderItem item : items) {
            item.attachToOrder(this);
            this.items.add(item);
        }
    }

    public UUID getId() { return id; }
    public Ecosystem getEcosystem() { return ecosystem; }
    public EcosystemOrderStatus getStatus() { return status; }
    public String getCurrency() { return currency; }
    public BigDecimal getSubtotalAmount() { return subtotalAmount; }
    public BigDecimal getShippingCostAmount() { return shippingCostAmount; }
    public String getShippingCurrency() { return shippingCurrency; }
    public UUID getShippingZoneId() { return shippingZoneId; }
    public String getShippingPostalCode() { return shippingPostalCode; }
    public BigDecimal getOriginalAmount() { return originalAmount; }
    public BigDecimal getDiscountAmount() { return discountAmount; }
    public UUID getAppliedPromotionId() { return appliedPromotionId; }
    public String getAppliedCouponCode() { return appliedCouponCode; }
    public Instant getPromotionConsumedAt() { return promotionConsumedAt; }
    public BigDecimal getTotalAmount() { return totalAmount; }
    public Instant getCreatedAt() { return createdAt; }
    public List<EcosystemOrderItem> getItems() { return items; }

    public boolean hasAppliedPromotion() {
        return appliedPromotionId != null && appliedCouponCode != null && !appliedCouponCode.isBlank();
    }

    public boolean isPromotionConsumed() {
        return promotionConsumedAt != null;
    }

    public void markPromotionConsumed() {
        if (!hasAppliedPromotion()) {
            throw new IllegalStateException("promotion_not_applied");
        }
        if (promotionConsumedAt == null) {
            promotionConsumedAt = Instant.now();
        }
    }
}
