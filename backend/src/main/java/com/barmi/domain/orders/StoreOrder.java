package com.barmi.domain.orders;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToMany;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "store_orders")
public class StoreOrder {
    @Id
    private UUID id;

    @Column(name = "store_id", nullable = false)
    private UUID storeId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private StoreOrderStatus status;

    @Column(nullable = false)
    private String currency;

    @Column(name = "subtotal_amount", nullable = false, precision = 19, scale = 2)
    private BigDecimal subtotalAmount;

    @Column(name = "total_amount", nullable = false, precision = 19, scale = 2)
    private BigDecimal totalAmount;

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

    @Column(name = "buyer_email")
    private String buyerEmail;

    @Column(name = "promotion_consumed_at")
    private Instant promotionConsumedAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @OneToMany
    @JoinColumn(name = "order_id", insertable = false, updatable = false)
    private List<StoreOrderItem> items;

    protected StoreOrder() {}

    private StoreOrder(
            UUID id,
            UUID storeId,
            StoreOrderStatus status,
            String currency,
            BigDecimal subtotalAmount,
            BigDecimal totalAmount,
            BigDecimal shippingCostAmount,
            String shippingCurrency,
            UUID shippingZoneId,
            String shippingPostalCode,
            BigDecimal originalAmount,
            BigDecimal discountAmount,
            UUID appliedPromotionId,
            String appliedCouponCode,
            String buyerEmail,
            List<StoreOrderItem> items
    ) {
        this.id = id;
        this.storeId = storeId;
        this.status = status;
        this.currency = currency;
        this.subtotalAmount = subtotalAmount;
        this.totalAmount = totalAmount;
        this.shippingCostAmount = shippingCostAmount;
        this.shippingCurrency = shippingCurrency;
        this.shippingZoneId = shippingZoneId;
        this.shippingPostalCode = shippingPostalCode;
        this.originalAmount = originalAmount;
        this.discountAmount = discountAmount;
        this.appliedPromotionId = appliedPromotionId;
        this.appliedCouponCode = appliedCouponCode;
        this.buyerEmail = buyerEmail;
        this.items = items;
    }

    public static StoreOrder create(
            UUID id,
            UUID storeId,
            String currency,
            BigDecimal subtotalAmount,
            BigDecimal totalAmount,
            BigDecimal shippingCostAmount,
            String shippingCurrency,
            UUID shippingZoneId,
            String shippingPostalCode,
            List<StoreOrderItem> items
    ) {
        return create(
                id,
                storeId,
                currency,
                subtotalAmount,
                totalAmount,
                shippingCostAmount,
                shippingCurrency,
                shippingZoneId,
                shippingPostalCode,
                totalAmount,
                BigDecimal.ZERO,
                null,
                null,
                null,
                items
        );
    }

    public static StoreOrder create(
            UUID id,
            UUID storeId,
            String currency,
            BigDecimal subtotalAmount,
            BigDecimal totalAmount,
            BigDecimal shippingCostAmount,
            String shippingCurrency,
            UUID shippingZoneId,
            String shippingPostalCode,
            BigDecimal originalAmount,
            BigDecimal discountAmount,
            UUID appliedPromotionId,
            String appliedCouponCode,
            List<StoreOrderItem> items
    ) {
        return create(
                id,
                storeId,
                currency,
                subtotalAmount,
                totalAmount,
                shippingCostAmount,
                shippingCurrency,
                shippingZoneId,
                shippingPostalCode,
                originalAmount,
                discountAmount,
                appliedPromotionId,
                appliedCouponCode,
                null,
                items
        );
    }

    public static StoreOrder create(
            UUID id,
            UUID storeId,
            String currency,
            BigDecimal subtotalAmount,
            BigDecimal totalAmount,
            BigDecimal shippingCostAmount,
            String shippingCurrency,
            UUID shippingZoneId,
            String shippingPostalCode,
            BigDecimal originalAmount,
            BigDecimal discountAmount,
            UUID appliedPromotionId,
            String appliedCouponCode,
            String buyerEmail,
            List<StoreOrderItem> items
    ) {
        if (id == null) throw new IllegalArgumentException("id is required");
        if (storeId == null) throw new IllegalArgumentException("storeId is required");
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
            throw new IllegalArgumentException("discount_total_mismatch");
        }
        if (shippingCostAmount.compareTo(BigDecimal.ZERO) > 0) {
            if (shippingZoneId == null || shippingPostalCode == null || shippingPostalCode.isBlank()) {
                throw new IllegalArgumentException("shipping snapshot required when shippingCostAmount > 0");
            }
            if (shippingCurrency == null || shippingCurrency.isBlank()) {
                throw new IllegalArgumentException("shippingCurrency is required when shippingCostAmount > 0");
            }
        }
        if (items == null || items.isEmpty()) throw new IllegalArgumentException("items are required");
        for (StoreOrderItem item : items) {
            if (item == null) throw new IllegalArgumentException("item cannot be null");
        }

        return new StoreOrder(
                id,
                storeId,
                StoreOrderStatus.PENDING_PAYMENT,
                currency,
                subtotalAmount,
                totalAmount,
                shippingCostAmount,
                shippingCurrency == null ? "" : shippingCurrency,
                shippingZoneId,
                shippingPostalCode,
                originalAmount,
                discountAmount,
                appliedPromotionId,
                appliedCouponCode,
                buyerEmail == null || buyerEmail.isBlank() ? null : buyerEmail,
                List.of()
        );
    }

    public void markPaid() {
        if (status != StoreOrderStatus.PENDING_PAYMENT) {
            throw new IllegalStateException("Only PENDING_PAYMENT orders can be marked as PAID");
        }
        this.status = StoreOrderStatus.PAID;
    }

    public void cancel() {
        if (status != StoreOrderStatus.PENDING_PAYMENT && status != StoreOrderStatus.PAID) {
            throw new IllegalStateException("Only PENDING_PAYMENT or PAID orders can be cancelled");
        }
        this.status = StoreOrderStatus.CANCELLED;
    }

    public UUID getId() { return id; }
    public UUID getStoreId() { return storeId; }
    public StoreOrderStatus getStatus() { return status; }
    public String getCurrency() { return currency; }
    public BigDecimal getSubtotalAmount() { return subtotalAmount; }
    public BigDecimal getTotalAmount() { return totalAmount; }
    public BigDecimal getShippingCostAmount() { return shippingCostAmount; }
    public String getShippingCurrency() { return shippingCurrency; }
    public UUID getShippingZoneId() { return shippingZoneId; }
    public String getShippingPostalCode() { return shippingPostalCode; }
    public BigDecimal getOriginalAmount() { return originalAmount; }
    public BigDecimal getDiscountAmount() { return discountAmount; }
    public UUID getAppliedPromotionId() { return appliedPromotionId; }
    public String getAppliedCouponCode() { return appliedCouponCode; }
    public String getBuyerEmail() { return buyerEmail; }
    public Instant getPromotionConsumedAt() { return promotionConsumedAt; }
    public Instant getCreatedAt() { return createdAt; }
    public List<StoreOrderItem> getItems() { return items; }

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
