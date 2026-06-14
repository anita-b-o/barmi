package com.barmi.infra.repo;

import com.barmi.domain.orders.StoreOrder;
import com.barmi.domain.orders.StoreOrderStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface StoreOrderRepository extends JpaRepository<StoreOrder, UUID> {
    @EntityGraph(attributePaths = "items")
    Optional<StoreOrder> findWithItemsByStoreIdAndId(UUID storeId, UUID id);
    Page<StoreOrder> findByStoreId(UUID storeId, Pageable pageable);
    Page<StoreOrder> findByStoreIdAndStatus(UUID storeId, StoreOrderStatus status, Pageable pageable);
    @Query("""
            select o
            from StoreOrder o
            where o.storeId = :storeId
              and (:status is null or o.status = :status)
              and (:applyCreatedFrom = false or o.createdAt >= :createdFrom)
              and (:applyCreatedTo = false or o.createdAt < :createdTo)
              and (
                    (:applyPaidWindow = false)
                    or exists (
                        select 1 from Payment p
                        where p.operationId = o.id
                          and p.scope = :paymentScope
                          and p.status = :confirmedPaymentStatus
                          and (:applyPaidFrom = false or p.confirmedAt >= :paidFrom)
                          and (:applyPaidTo = false or p.confirmedAt < :paidTo)
                    )
                )
              and (
                    :hasOperationalConflict is null
                    or (:hasOperationalConflict = true and o.status = :pendingPaymentStatus and exists (
                        select 1 from OutboxEvent e
                        where e.aggregateId = o.id
                          and e.eventType = :conflictEventType
                    ))
                    or (:hasOperationalConflict = false and not (
                        o.status = :pendingPaymentStatus and exists (
                            select 1 from OutboxEvent e
                            where e.aggregateId = o.id
                              and e.eventType = :conflictEventType
                        )
                    ))
                )
              and (
                    :manuallyCancelled is null
                    or (:manuallyCancelled = true and exists (
                        select 1 from OutboxEvent e
                        where e.aggregateId = o.id
                          and e.eventType = :manualCancelledEventType
                          and (:applyManualCancelledFrom = false or e.occurredAt >= :manualCancelledFrom)
                          and (:applyManualCancelledTo = false or e.occurredAt < :manualCancelledTo)
                    ))
                    or (:manuallyCancelled = false and not exists (
                        select 1 from OutboxEvent e
                        where e.aggregateId = o.id
                          and e.eventType = :manualCancelledEventType
                    ))
                )
              and (
                    :hasConflictEvent is null
                    or (:hasConflictEvent = true and exists (
                        select 1 from OutboxEvent e
                        where e.aggregateId = o.id
                          and e.eventType = :conflictEventType
                          and (:applyConflictFrom = false or e.occurredAt >= :conflictFrom)
                          and (:applyConflictTo = false or e.occurredAt < :conflictTo)
                    ))
                    or (:hasConflictEvent = false and not exists (
                        select 1 from OutboxEvent e
                        where e.aggregateId = o.id
                          and e.eventType = :conflictEventType
                    ))
                )
              and (
                    :hasFulfillment is null
                    or (:hasFulfillment = true and exists (
                        select 1 from StoreFulfillment f
                        where f.storeOrderId = o.id
                    ))
                    or (:hasFulfillment = false and not exists (
                        select 1 from StoreFulfillment f
                        where f.storeOrderId = o.id
                    ))
                )
            """)
    Page<StoreOrder> findAdminOrders(
            @Param("storeId") UUID storeId,
            @Param("status") StoreOrderStatus status,
            @Param("applyCreatedFrom") boolean applyCreatedFrom,
            @Param("createdFrom") Instant createdFrom,
            @Param("applyCreatedTo") boolean applyCreatedTo,
            @Param("createdTo") Instant createdTo,
            @Param("applyPaidWindow") boolean applyPaidWindow,
            @Param("applyPaidFrom") boolean applyPaidFrom,
            @Param("paidFrom") Instant paidFrom,
            @Param("applyPaidTo") boolean applyPaidTo,
            @Param("paidTo") Instant paidTo,
            @Param("hasOperationalConflict") Boolean hasOperationalConflict,
            @Param("manuallyCancelled") Boolean manuallyCancelled,
            @Param("applyManualCancelledFrom") boolean applyManualCancelledFrom,
            @Param("manualCancelledFrom") Instant manualCancelledFrom,
            @Param("applyManualCancelledTo") boolean applyManualCancelledTo,
            @Param("manualCancelledTo") Instant manualCancelledTo,
            @Param("hasConflictEvent") Boolean hasConflictEvent,
            @Param("applyConflictFrom") boolean applyConflictFrom,
            @Param("conflictFrom") Instant conflictFrom,
            @Param("applyConflictTo") boolean applyConflictTo,
            @Param("conflictTo") Instant conflictTo,
            @Param("hasFulfillment") Boolean hasFulfillment,
            @Param("paymentScope") com.barmi.domain.enums.PaymentScope paymentScope,
            @Param("confirmedPaymentStatus") com.barmi.domain.payments.PaymentStatus confirmedPaymentStatus,
            @Param("pendingPaymentStatus") StoreOrderStatus pendingPaymentStatus,
            @Param("manualCancelledEventType") String manualCancelledEventType,
            @Param("conflictEventType") String conflictEventType,
            Pageable pageable
    );
    long countByStoreId(UUID storeId);
    long countByStoreIdAndStatus(UUID storeId, StoreOrderStatus status);
    long countByStoreIdAndCreatedAtGreaterThanEqualAndCreatedAtLessThan(UUID storeId, Instant fromInclusive, Instant toExclusive);
    long countByStoreIdAndStatusAndCreatedAtGreaterThanEqualAndCreatedAtLessThan(UUID storeId, StoreOrderStatus status, Instant fromInclusive, Instant toExclusive);

    @Query("select coalesce(sum(o.totalAmount), 0) from StoreOrder o where o.storeId = :storeId and o.status = :status")
    BigDecimal sumTotalAmountByStoreIdAndStatus(@Param("storeId") UUID storeId, @Param("status") StoreOrderStatus status);

    @Query("""
            select coalesce(sum(o.totalAmount), 0)
            from StoreOrder o
            where o.storeId = :storeId
              and o.status = :status
              and o.createdAt >= :fromInclusive
              and o.createdAt < :toExclusive
            """)
    BigDecimal sumTotalAmountByStoreIdAndStatusInRange(
            @Param("storeId") UUID storeId,
            @Param("status") StoreOrderStatus status,
            @Param("fromInclusive") Instant fromInclusive,
            @Param("toExclusive") Instant toExclusive
    );

    @Query("select distinct o.currency from StoreOrder o where o.storeId = :storeId and o.status = :status")
    List<String> findDistinctCurrenciesByStoreIdAndStatus(@Param("storeId") UUID storeId, @Param("status") StoreOrderStatus status);
}
