package com.barmi.infra.repo;

import com.barmi.domain.fulfillment.EcosystemFulfillment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface EcosystemFulfillmentRepository extends JpaRepository<EcosystemFulfillment, UUID> {
    Optional<EcosystemFulfillment> findByEcosystemOrderId(UUID ecosystemOrderId);
}
