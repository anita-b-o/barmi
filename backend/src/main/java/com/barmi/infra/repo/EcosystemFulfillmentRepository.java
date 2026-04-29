package com.barmi.infra.repo;

import com.barmi.domain.fulfillment.EcosystemFulfillment;
import com.barmi.domain.fulfillment.FulfillmentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface EcosystemFulfillmentRepository extends JpaRepository<EcosystemFulfillment, UUID> {
    Optional<EcosystemFulfillment> findByEcosystemOrderId(UUID ecosystemOrderId);
    List<EcosystemFulfillment> findAllByEcosystemIdOrderByCreatedAtDesc(UUID ecosystemId);
    Optional<EcosystemFulfillment> findByIdAndEcosystemId(UUID id, UUID ecosystemId);
    @Query("""
            select f
            from EcosystemFulfillment f
            where f.ecosystemId = :ecosystemId
              and (:applyCreatedFrom = false or f.createdAt >= :createdFrom)
              and (:applyCreatedTo = false or f.createdAt < :createdTo)
            order by f.createdAt desc
            """)
    List<EcosystemFulfillment> searchForAdmin(
            @Param("ecosystemId") UUID ecosystemId,
            @Param("applyCreatedFrom") boolean applyCreatedFrom,
            @Param("createdFrom") Instant createdFrom,
            @Param("applyCreatedTo") boolean applyCreatedTo,
            @Param("createdTo") Instant createdTo
    );
    long countByEcosystemIdAndStatus(UUID ecosystemId, FulfillmentStatus status);
    long countByEcosystemIdAndCreatedAtGreaterThanEqualAndCreatedAtLessThan(UUID ecosystemId, Instant fromInclusive, Instant toExclusive);
}
