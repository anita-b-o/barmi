package com.barmi.infra.repo;

import com.barmi.domain.catalog.Product;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
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
    interface PublicSitemapProductView {
        String getStoreSlug();
        String getProductSlug();
    }

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
    Page<Product> searchPublicCatalogPage(
            @Param("storeId") UUID storeId,
            @Param("query") String query,
            @Param("availableOnly") boolean availableOnly,
            @Param("categoryId") UUID categoryId,
            Pageable pageable
    );
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Product p where p.storeId = :storeId and p.id in :ids")
    List<Product> findAllByStoreIdAndIdInForUpdate(UUID storeId, Collection<UUID> ids);
    java.util.Optional<Product> findByIdAndStoreId(UUID id, UUID storeId);
    java.util.Optional<Product> findByStoreIdAndPublicSlugAndActiveTrue(UUID storeId, String publicSlug);
    @Query("""
            select s.slug as storeSlug, p.publicSlug as productSlug
            from Product p, Store s
            where p.storeId = s.id
              and p.active = true
              and p.publicSlug is not null
              and p.publicSlug <> ''
              and s.active = true
              and s.ecosystem.slug = :ecosystemSlug
            order by s.slug asc, p.publicSlug asc
            """)
    List<PublicSitemapProductView> findPublicSitemapProducts(@Param("ecosystemSlug") String ecosystemSlug);
    boolean existsByStoreIdAndSku(UUID storeId, String sku);
    java.util.Optional<Product> findByStoreIdAndSku(UUID storeId, String sku);
    boolean existsByStoreIdAndSkuAndIdNot(UUID storeId, String sku, UUID id);
    boolean existsByStoreIdAndPublicSlug(UUID storeId, String publicSlug);
    long countByStoreIdAndActiveTrue(UUID storeId);
    long countByStoreIdAndActiveFalse(UUID storeId);
}
