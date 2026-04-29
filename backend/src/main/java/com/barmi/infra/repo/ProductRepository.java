package com.barmi.infra.repo;

import com.barmi.domain.catalog.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.domain.Sort;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface ProductRepository extends JpaRepository<Product, UUID> {
    List<Product> findByStoreIdOrderByCreatedAtAsc(UUID storeId);
    List<Product> findByStoreIdAndActiveTrueOrderByCreatedAtAsc(UUID storeId);
    @Query("""
            select p
            from Product p
            where p.storeId = :storeId
              and p.active = true
              and (:availableOnly = false or p.stockQuantity > 0)
              and (:categoryId is null or p.categoryId = :categoryId)
              and (
                    :query = ''
                    or lower(p.name) like lower(concat('%', :query, '%'))
                    or lower(p.sku) like lower(concat('%', :query, '%'))
              )
            """)
    List<Product> searchPublicCatalog(
            @Param("storeId") UUID storeId,
            @Param("query") String query,
            @Param("availableOnly") boolean availableOnly,
            @Param("categoryId") UUID categoryId,
            Sort sort
    );
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Product p where p.storeId = :storeId and p.id in :ids")
    List<Product> findAllByStoreIdAndIdInForUpdate(UUID storeId, Collection<UUID> ids);
    java.util.Optional<Product> findByIdAndStoreId(UUID id, UUID storeId);
    boolean existsByStoreIdAndSku(UUID storeId, String sku);
    boolean existsByStoreIdAndSkuAndIdNot(UUID storeId, String sku, UUID id);
    long countByStoreIdAndActiveTrue(UUID storeId);
    long countByStoreIdAndActiveFalse(UUID storeId);
}
