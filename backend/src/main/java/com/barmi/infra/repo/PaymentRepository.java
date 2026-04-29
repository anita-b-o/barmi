package com.barmi.infra.repo;

import com.barmi.domain.enums.PaymentScope;
import com.barmi.domain.payments.Payment;
import com.barmi.domain.payments.PaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.Set;
import java.util.List;
import java.util.UUID;

public interface PaymentRepository extends JpaRepository<Payment, UUID> {
    Optional<Payment> findByProviderAndProviderPaymentId(String provider, String providerPaymentId);
    boolean existsByScopeAndOperationIdAndStatus(PaymentScope scope, UUID operationId, PaymentStatus status);
    Optional<Payment> findFirstByScopeAndOperationIdAndStatus(PaymentScope scope, UUID operationId, PaymentStatus status);
    Optional<Payment> findFirstByScopeAndOperationId(PaymentScope scope, UUID operationId);
    @Query("""
            select p.operationId
            from Payment p
            where p.scope = :scope
              and p.status = :status
              and p.operationId in :operationIds
            """)
    Set<UUID> findOperationIdsByScopeAndStatusAndOperationIdIn(
            @Param("scope") PaymentScope scope,
            @Param("status") PaymentStatus status,
            @Param("operationIds") Set<UUID> operationIds
    );

    @Query("""
            select count(distinct p.operationId)
            from Payment p
            join StoreOrder o on o.id = p.operationId
            where p.scope = :scope
              and p.status = :status
              and o.storeId = :storeId
              and p.confirmedAt >= :fromInclusive
              and p.confirmedAt < :toExclusive
            """)
    long countConfirmedStorePaymentsInRange(
            @Param("scope") PaymentScope scope,
            @Param("status") PaymentStatus status,
            @Param("storeId") UUID storeId,
            @Param("fromInclusive") Instant fromInclusive,
            @Param("toExclusive") Instant toExclusive
    );

    @Query("""
            select coalesce(sum(p.amount), 0)
            from Payment p
            join StoreOrder o on o.id = p.operationId
            where p.scope = :scope
              and p.status = :status
              and o.storeId = :storeId
              and p.confirmedAt >= :fromInclusive
              and p.confirmedAt < :toExclusive
            """)
    BigDecimal sumConfirmedStorePaymentsAmountInRange(
            @Param("scope") PaymentScope scope,
            @Param("status") PaymentStatus status,
            @Param("storeId") UUID storeId,
            @Param("fromInclusive") Instant fromInclusive,
            @Param("toExclusive") Instant toExclusive
    );

    @Query("""
            select distinct p.currency
            from Payment p
            join StoreOrder o on o.id = p.operationId
            where p.scope = :scope
              and p.status = :status
              and o.storeId = :storeId
              and p.confirmedAt >= :fromInclusive
              and p.confirmedAt < :toExclusive
            """)
    List<String> findDistinctConfirmedStorePaymentCurrenciesInRange(
            @Param("scope") PaymentScope scope,
            @Param("status") PaymentStatus status,
            @Param("storeId") UUID storeId,
            @Param("fromInclusive") Instant fromInclusive,
            @Param("toExclusive") Instant toExclusive
    );

    @Query("""
            select count(distinct p.operationId)
            from Payment p
            join EcosystemOrder o on o.id = p.operationId
            where p.scope = :scope
              and p.status = :status
              and o.ecosystem.id = :ecosystemId
              and p.confirmedAt >= :fromInclusive
              and p.confirmedAt < :toExclusive
            """)
    long countConfirmedEcosystemPaymentsInRange(
            @Param("scope") PaymentScope scope,
            @Param("status") PaymentStatus status,
            @Param("ecosystemId") UUID ecosystemId,
            @Param("fromInclusive") Instant fromInclusive,
            @Param("toExclusive") Instant toExclusive
    );

    @Query("""
            select coalesce(sum(p.amount), 0)
            from Payment p
            join EcosystemOrder o on o.id = p.operationId
            where p.scope = :scope
              and p.status = :status
              and o.ecosystem.id = :ecosystemId
              and p.confirmedAt >= :fromInclusive
              and p.confirmedAt < :toExclusive
            """)
    BigDecimal sumConfirmedEcosystemPaymentsAmountInRange(
            @Param("scope") PaymentScope scope,
            @Param("status") PaymentStatus status,
            @Param("ecosystemId") UUID ecosystemId,
            @Param("fromInclusive") Instant fromInclusive,
            @Param("toExclusive") Instant toExclusive
    );

    @Query("""
            select distinct p.currency
            from Payment p
            join EcosystemOrder o on o.id = p.operationId
            where p.scope = :scope
              and p.status = :status
              and o.ecosystem.id = :ecosystemId
              and p.confirmedAt >= :fromInclusive
              and p.confirmedAt < :toExclusive
            """)
    List<String> findDistinctConfirmedEcosystemPaymentCurrenciesInRange(
            @Param("scope") PaymentScope scope,
            @Param("status") PaymentStatus status,
            @Param("ecosystemId") UUID ecosystemId,
            @Param("fromInclusive") Instant fromInclusive,
            @Param("toExclusive") Instant toExclusive
    );

    @Query("""
            select distinct p.operationId
            from Payment p
            join EcosystemOrder o on o.id = p.operationId
            where p.scope = :scope
              and p.status = :status
              and (:ecosystemId is null or o.ecosystem.id = :ecosystemId)
              and p.confirmedAt >= :fromInclusive
              and p.confirmedAt < :toExclusive
            """)
    Set<UUID> findConfirmedEcosystemOperationIdsInRange(
            @Param("scope") PaymentScope scope,
            @Param("status") PaymentStatus status,
            @Param("ecosystemId") UUID ecosystemId,
            @Param("fromInclusive") Instant fromInclusive,
            @Param("toExclusive") Instant toExclusive
    );
}
