package com.barmi.infra.repo;

import com.barmi.domain.catalog.StorePromotion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import java.time.Instant;
import java.util.UUID;

public interface StorePromotionRepository extends JpaRepository<StorePromotion, UUID> {
    List<StorePromotion> findByStoreIdOrderByCreatedAtDesc(UUID storeId);
    Optional<StorePromotion> findByIdAndStoreId(UUID id, UUID storeId);
    boolean existsByStoreIdAndCode(UUID storeId, String code);
    Optional<StorePromotion> findByStoreIdAndCode(UUID storeId, String code);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from StorePromotion p where p.storeId = :storeId and p.code = :code")
    Optional<StorePromotion> findByStoreIdAndCodeForUpdate(@Param("storeId") UUID storeId, @Param("code") String code);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from StorePromotion p where p.id = :id")
    Optional<StorePromotion> findByIdForUpdate(@Param("id") UUID id);

    @Query("""
            select p
            from StorePromotion p
            where p.storeId = :storeId
              and p.active = true
              and (p.expirationDate is null or p.expirationDate > :now)
              and (p.usageLimit is null or p.usageCount < p.usageLimit)
            order by p.createdAt desc
            """)
    List<StorePromotion> findVisiblePublicPromotions(@Param("storeId") UUID storeId, @Param("now") Instant now);
}
