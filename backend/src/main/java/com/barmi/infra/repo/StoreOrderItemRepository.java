package com.barmi.infra.repo;

import com.barmi.domain.orders.StoreOrderItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface StoreOrderItemRepository extends JpaRepository<StoreOrderItem, UUID> {
    List<StoreOrderItem> findByOrderId(UUID orderId);
}
