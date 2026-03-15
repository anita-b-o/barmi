package com.barmi.infra.repo;

import com.barmi.domain.orders.StoreOrder;
import com.barmi.domain.orders.StoreOrderStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface StoreOrderRepository extends JpaRepository<StoreOrder, UUID> {
    @EntityGraph(attributePaths = "items")
    Optional<StoreOrder> findWithItemsByStoreIdAndId(UUID storeId, UUID id);
    Page<StoreOrder> findByStoreId(UUID storeId, Pageable pageable);
    Page<StoreOrder> findByStoreIdAndStatus(UUID storeId, StoreOrderStatus status, Pageable pageable);
}
