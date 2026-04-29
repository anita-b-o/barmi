package com.barmi.infra.repo;

import com.barmi.domain.orders.EcosystemOrder;
import com.barmi.domain.orders.EcosystemOrderStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

public interface EcosystemOrderRepository extends JpaRepository<EcosystemOrder, UUID> {
    @EntityGraph(attributePaths = "items")
    Optional<EcosystemOrder> findWithItemsById(UUID id);

    Page<EcosystemOrder> findByStatus(EcosystemOrderStatus status, Pageable pageable);
    Page<EcosystemOrder> findByEcosystem_Id(UUID ecosystemId, Pageable pageable);
    Page<EcosystemOrder> findByEcosystem_IdAndStatus(UUID ecosystemId, EcosystemOrderStatus status, Pageable pageable);
    long countByEcosystem_Id(UUID ecosystemId);
    long countByEcosystem_IdAndStatus(UUID ecosystemId, EcosystemOrderStatus status);
    long countByEcosystem_IdAndCreatedAtGreaterThanEqualAndCreatedAtLessThan(UUID ecosystemId, Instant fromInclusive, Instant toExclusive);

    @Query("select coalesce(sum(o.totalAmount), 0) from EcosystemOrder o where o.ecosystem.id = :ecosystemId and o.status = :status")
    BigDecimal sumTotalAmountByEcosystemIdAndStatus(@Param("ecosystemId") UUID ecosystemId, @Param("status") EcosystemOrderStatus status);

    @Query("select distinct o.currency from EcosystemOrder o where o.ecosystem.id = :ecosystemId and o.status = :status")
    List<String> findDistinctCurrenciesByEcosystemIdAndStatus(@Param("ecosystemId") UUID ecosystemId, @Param("status") EcosystemOrderStatus status);

    @Query("""
            select o
            from EcosystemOrder o
            where (:ecosystemId is null or o.ecosystem.id = :ecosystemId)
              and (:status is null or o.status = :status)
              and (:applyCreatedFrom = false or o.createdAt >= :createdFrom)
              and (:applyCreatedTo = false or o.createdAt < :createdTo)
              and (:applyOrderIdsFilter = false or o.id in :orderIds)
            """)
    Page<EcosystemOrder> searchForAdmin(
            @Param("ecosystemId") UUID ecosystemId,
            @Param("status") EcosystemOrderStatus status,
            @Param("applyCreatedFrom") boolean applyCreatedFrom,
            @Param("createdFrom") Instant createdFrom,
            @Param("applyCreatedTo") boolean applyCreatedTo,
            @Param("createdTo") Instant createdTo,
            @Param("applyOrderIdsFilter") boolean applyOrderIdsFilter,
            @Param("orderIds") Set<UUID> orderIds,
            Pageable pageable
    );
}
