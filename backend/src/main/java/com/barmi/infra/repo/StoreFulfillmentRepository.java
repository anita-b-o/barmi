package com.barmi.infra.repo;

import com.barmi.domain.fulfillment.StoreFulfillment;
import com.barmi.domain.fulfillment.FulfillmentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.time.Instant;
import java.util.UUID;

public interface StoreFulfillmentRepository extends JpaRepository<StoreFulfillment, UUID> {
    List<StoreFulfillment> findAllByStoreIdOrderByCreatedAtDesc(UUID storeId);
    List<StoreFulfillment> findAllByStoreIdAndCreatedAtGreaterThanEqualAndCreatedAtLessThanOrderByCreatedAtDesc(UUID storeId, Instant fromInclusive, Instant toExclusive);
    List<StoreFulfillment> findAllByStoreIdAndCreatedAtGreaterThanEqualOrderByCreatedAtDesc(UUID storeId, Instant fromInclusive);
    List<StoreFulfillment> findAllByStoreIdAndCreatedAtLessThanOrderByCreatedAtDesc(UUID storeId, Instant toExclusive);
    Optional<StoreFulfillment> findByIdAndStoreId(UUID id, UUID storeId);
    Optional<StoreFulfillment> findByStoreOrderId(UUID storeOrderId);
    @Query("select f.storeOrderId from StoreFulfillment f where f.storeOrderId in :storeOrderIds")
    Set<UUID> findStoreOrderIdsByStoreOrderIdIn(@Param("storeOrderIds") Set<UUID> storeOrderIds);
    long countByStoreIdAndStatus(UUID storeId, FulfillmentStatus status);
    long countByStoreIdAndCreatedAtGreaterThanEqualAndCreatedAtLessThan(UUID storeId, Instant fromInclusive, Instant toExclusive);
}
