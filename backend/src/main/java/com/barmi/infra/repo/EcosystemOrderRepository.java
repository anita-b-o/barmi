package com.barmi.infra.repo;

import com.barmi.domain.orders.EcosystemOrder;
import com.barmi.domain.orders.EcosystemOrderStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;

import java.util.Optional;
import java.util.UUID;

public interface EcosystemOrderRepository extends JpaRepository<EcosystemOrder, UUID> {
    @EntityGraph(attributePaths = "items")
    Optional<EcosystemOrder> findWithItemsById(UUID id);

    Page<EcosystemOrder> findByStatus(EcosystemOrderStatus status, Pageable pageable);
}
