package com.barmi.infra.repo;

import com.barmi.domain.fulfillment.StoreFulfillment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface StoreFulfillmentRepository extends JpaRepository<StoreFulfillment, UUID> {
    List<StoreFulfillment> findAllByStoreIdOrderByCreatedAtDesc(UUID storeId);
    Optional<StoreFulfillment> findByIdAndStoreId(UUID id, UUID storeId);
    Optional<StoreFulfillment> findByStoreOrderId(UUID storeOrderId);
}
