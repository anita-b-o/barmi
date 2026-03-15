package com.barmi.domain.orders;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "store_order_items")
public class StoreOrderItem {
    @Id
    private UUID id;

    @Column(name = "order_id", nullable = false)
    private UUID orderId;

    @Column(name = "product_id", nullable = false)
    private UUID productId;

    @Column(nullable = false)
    private int qty;

    @Column(name = "unit_price_amount", nullable = false, precision = 19, scale = 2)
    private BigDecimal unitPriceAmount;

    @Column(name = "line_total_amount", nullable = false, precision = 19, scale = 2)
    private BigDecimal lineTotalAmount;

    @Column(nullable = false)
    private String currency;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "item_snapshot", nullable = false, columnDefinition = "jsonb")
    private String itemSnapshotJson;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    protected StoreOrderItem() {}

    public StoreOrderItem(
            UUID id,
            UUID orderId,
            UUID productId,
            int qty,
            BigDecimal unitPriceAmount,
            BigDecimal lineTotalAmount,
            String currency,
            String itemSnapshotJson
    ) {
        if (id == null) throw new IllegalArgumentException("id is required");
        if (orderId == null) throw new IllegalArgumentException("orderId is required");
        if (productId == null) throw new IllegalArgumentException("productId is required");
        if (qty < 1) throw new IllegalArgumentException("qty must be >= 1");
        if (unitPriceAmount == null || unitPriceAmount.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("unitPriceAmount must be >= 0");
        }
        if (lineTotalAmount == null || lineTotalAmount.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("lineTotalAmount must be >= 0");
        }
        if (currency == null || currency.isBlank()) throw new IllegalArgumentException("currency is required");
        if (itemSnapshotJson == null || itemSnapshotJson.isBlank()) {
            throw new IllegalArgumentException("itemSnapshotJson is required");
        }

        this.id = id;
        this.orderId = orderId;
        this.productId = productId;
        this.qty = qty;
        this.unitPriceAmount = unitPriceAmount;
        this.lineTotalAmount = lineTotalAmount;
        this.currency = currency;
        this.itemSnapshotJson = itemSnapshotJson;
    }

    public UUID getId() { return id; }
    public UUID getOrderId() { return orderId; }
    public UUID getProductId() { return productId; }
    public int getQty() { return qty; }
    public BigDecimal getUnitPriceAmount() { return unitPriceAmount; }
    public BigDecimal getLineTotalAmount() { return lineTotalAmount; }
    public String getCurrency() { return currency; }
    public String getItemSnapshotJson() { return itemSnapshotJson; }
    public Instant getCreatedAt() { return createdAt; }
}
