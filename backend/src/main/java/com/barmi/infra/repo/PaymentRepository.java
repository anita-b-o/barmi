package com.barmi.infra.repo;

import com.barmi.domain.enums.PaymentScope;
import com.barmi.domain.payments.Payment;
import com.barmi.domain.payments.PaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface PaymentRepository extends JpaRepository<Payment, UUID> {
    Optional<Payment> findByProviderAndProviderPaymentId(String provider, String providerPaymentId);
    boolean existsByScopeAndOperationIdAndStatus(PaymentScope scope, UUID operationId, PaymentStatus status);
    Optional<Payment> findFirstByScopeAndOperationIdAndStatus(PaymentScope scope, UUID operationId, PaymentStatus status);
    Optional<Payment> findFirstByScopeAndOperationId(PaymentScope scope, UUID operationId);
}
