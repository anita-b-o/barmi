package com.barmi.infra.repo;

import com.barmi.domain.store.Store;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface StoreRepository extends JpaRepository<Store, UUID> {
    interface StorePublicCategoryCountView {
        String getCategoryKey();
        long getStoreCount();
    }

    Optional<Store> findBySlug(String slug);
    List<Store> findTop6ByActiveTrueAndEcosystem_IdOrderByCreatedAtDesc(UUID ecosystemId);
    List<Store> findByActiveTrueAndEcosystem_SlugOrderBySlugAsc(String ecosystemSlug);

    @Query("""
            select s
            from Store s
            where s.active = true
              and s.ecosystem.id = :ecosystemId
              and (:mappedOnly = false or (s.publicLatitude is not null and s.publicLongitude is not null))
              and (:query = '' or lower(s.name) like lower(concat('%', :query, '%')))
              and (:categoryKey = '' or s.publicCategoryKey = :categoryKey)
            """)
    List<Store> searchPublicStores(
            @Param("ecosystemId") UUID ecosystemId,
            @Param("query") String query,
            @Param("categoryKey") String categoryKey,
            @Param("mappedOnly") boolean mappedOnly,
            org.springframework.data.domain.Sort sort
    );

    @Query("""
            select s.publicCategoryKey as categoryKey, count(s) as storeCount
            from Store s
            where s.active = true
              and s.ecosystem.id = :ecosystemId
              and s.publicCategoryKey is not null
            group by s.publicCategoryKey
            """)
    List<StorePublicCategoryCountView> countPublicCategoriesForEcosystem(@Param("ecosystemId") UUID ecosystemId);
}
