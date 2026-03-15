package com.barmi.domain.orders;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "ecosystem_order_items")
public class EcosystemOrderItem {
    @Id
    private UUID id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "ecosystem_order_id", nullable = false)
    private EcosystemOrder ecosystemOrder;

    @Column(name = "external_product_id")
    private UUID externalProductId;

    @Column(nullable = false)
    private int qty;

    @Column(name = "unit_price_amount", nullable = false, precision = 19, scale = 2)
    private BigDecimal unitPriceAmount;

    @Column(name = "line_total_amount", nullable = false, precision = 19, scale = 2)
    private BigDecimal lineTotalAmount;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "item_snapshot", nullable = false, columnDefinition = "jsonb")
    private String itemSnapshotJson;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    protected EcosystemOrderItem() {}

    public EcosystemOrderItem(
            UUID id,
            UUID externalProductId,
            int qty,
            BigDecimal unitPriceAmount,
            BigDecimal lineTotalAmount,
            String itemSnapshotJson
    ) {
        if (id == null) throw new IllegalArgumentException("id is required");
        if (qty < 1) throw new IllegalArgumentException("qty must be >= 1");
        if (unitPriceAmount == null || unitPriceAmount.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("unitPriceAmount must be >= 0");
        }
        if (lineTotalAmount == null || lineTotalAmount.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("lineTotalAmount must be >= 0");
        }
        if (itemSnapshotJson == null || itemSnapshotJson.isBlank()) {
            throw new IllegalArgumentException("itemSnapshotJson is required");
        }

        this.id = id;
        this.externalProductId = externalProductId;
        this.qty = qty;
        this.unitPriceAmount = unitPriceAmount;
        this.lineTotalAmount = lineTotalAmount;
        this.itemSnapshotJson = itemSnapshotJson;
    }

    void attachToOrder(EcosystemOrder order) {
        this.ecosystemOrder = order;
    }

    public UUID getId() { return id; }
    public EcosystemOrder getEcosystemOrder() { return ecosystemOrder; }
    public UUID getExternalProductId() { return externalProductId; }
    public int getQty() { return qty; }
    public BigDecimal getUnitPriceAmount() { return unitPriceAmount; }
    public BigDecimal getLineTotalAmount() { return lineTotalAmount; }
    public String getItemSnapshotJson() { return itemSnapshotJson; }
    public Instant getCreatedAt() { return createdAt; }
}
