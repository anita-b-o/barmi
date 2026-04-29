package com.barmi.infra.repo;

import com.barmi.domain.enums.PaymentScope;
import com.barmi.domain.payments.PaymentIntent;
import com.barmi.domain.payments.PaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.List;
import java.util.UUID;

public interface PaymentIntentRepository extends JpaRepository<PaymentIntent, UUID> {
    List<PaymentIntent> findByScopeAndStoreOrderIdOrderByCreatedAtAsc(
            PaymentScope scope,
            UUID storeOrderId
    );

    Optional<PaymentIntent> findFirstByScopeAndStoreOrderIdAndProviderAndStatus(
            PaymentScope scope,
            UUID storeOrderId,
            String provider,
            PaymentStatus status
    );

    Optional<PaymentIntent> findFirstByScopeAndEcosystemOrderIdAndProviderAndStatus(
            PaymentScope scope,
            UUID ecosystemOrderId,
            String provider,
            PaymentStatus status
    );
}
