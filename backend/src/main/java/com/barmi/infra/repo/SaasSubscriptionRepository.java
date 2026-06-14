package com.barmi.infra.repo;

import com.barmi.domain.saas.SaasSubscription;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SaasSubscriptionRepository extends JpaRepository<SaasSubscription, UUID> {
    @EntityGraph(attributePaths = "plan")
    Optional<SaasSubscription> findByStoreId(UUID storeId);

    boolean existsByStoreId(UUID storeId);

    @EntityGraph(attributePaths = "plan")
    List<SaasSubscription> findAllByOrderByCreatedAtAsc();
}
