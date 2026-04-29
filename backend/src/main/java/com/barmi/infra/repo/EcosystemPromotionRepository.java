package com.barmi.infra.repo;

import com.barmi.domain.ecosystem.EcosystemPromotion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface EcosystemPromotionRepository extends JpaRepository<EcosystemPromotion, UUID> {
    List<EcosystemPromotion> findByEcosystemIdOrderByCreatedAtDesc(UUID ecosystemId);
    Optional<EcosystemPromotion> findByIdAndEcosystemId(UUID id, UUID ecosystemId);
    boolean existsByEcosystemIdAndCode(UUID ecosystemId, String code);
    Optional<EcosystemPromotion> findByEcosystemIdAndCode(UUID ecosystemId, String code);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from EcosystemPromotion p where p.ecosystemId = :ecosystemId and p.code = :code")
    Optional<EcosystemPromotion> findByEcosystemIdAndCodeForUpdate(@Param("ecosystemId") UUID ecosystemId, @Param("code") String code);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from EcosystemPromotion p where p.id = :id")
    Optional<EcosystemPromotion> findByIdForUpdate(@Param("id") UUID id);

    @Query("""
            select p
            from EcosystemPromotion p
            where p.ecosystemId = :ecosystemId
              and p.active = true
              and (p.expirationDate is null or p.expirationDate > :now)
              and (p.usageLimit is null or p.usageCount < p.usageLimit)
            order by p.createdAt desc
            """)
    List<EcosystemPromotion> findVisiblePublicPromotions(@Param("ecosystemId") UUID ecosystemId, @Param("now") Instant now);
}
