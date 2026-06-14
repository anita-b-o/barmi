package com.barmi.infra.repo;

import com.barmi.domain.orders.StoreOrderItem;
import com.barmi.domain.orders.StoreOrderStatus;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface StoreOrderItemRepository extends JpaRepository<StoreOrderItem, UUID> {
    interface StoreCommerceProductSalesView {
        String getProductSlug();
        String getProductName();
        long getQuantitySold();
        BigDecimal getRevenueAmount();
    }

    List<StoreOrderItem> findByOrderId(UUID orderId);

    @Query("""
            select p.publicSlug as productSlug,
                   p.name as productName,
                   coalesce(sum(i.qty), 0) as quantitySold,
                   coalesce(sum(i.lineTotalAmount), 0) as revenueAmount
            from StoreOrderItem i
            join StoreOrder o on o.id = i.orderId
            join Product p on p.id = i.productId
            where o.storeId = :storeId
              and o.status = :status
              and o.createdAt >= :fromInclusive
              and o.createdAt < :toExclusive
            group by p.publicSlug, p.name
            order by coalesce(sum(i.qty), 0) desc, coalesce(sum(i.lineTotalAmount), 0) desc, p.publicSlug asc
            """)
    List<StoreCommerceProductSalesView> findTopStoreCommerceProductsInRange(
            @Param("storeId") UUID storeId,
            @Param("status") StoreOrderStatus status,
            @Param("fromInclusive") Instant fromInclusive,
            @Param("toExclusive") Instant toExclusive,
            Pageable pageable
    );

    @Query("""
            select coalesce(sum(i.qty), 0)
            from StoreOrderItem i
            join StoreOrder o on o.id = i.orderId
            where o.storeId = :storeId
              and o.status = :status
              and o.createdAt >= :fromInclusive
              and o.createdAt < :toExclusive
            """)
    long sumQuantitySoldByStoreIdAndStatusInRange(
            @Param("storeId") UUID storeId,
            @Param("status") StoreOrderStatus status,
            @Param("fromInclusive") Instant fromInclusive,
            @Param("toExclusive") Instant toExclusive
    );
}
