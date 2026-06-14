package com.barmi.infra.repo;

import com.barmi.domain.ecosystem.EcosystemExternalProduct;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface EcosystemExternalProductRepository extends JpaRepository<EcosystemExternalProduct, UUID> {

    Optional<EcosystemExternalProduct> findByIdAndEcosystem_Id(UUID id, UUID ecosystemId);

    @Query("select p from EcosystemExternalProduct p where p.ecosystem.id = :ecosystemId and (:activeOnly = false or p.active = true) and (:queryPattern = '' or lower(p.name) like :queryPattern) order by p.createdAt desc")
    List<EcosystemExternalProduct> findByEcosystemWithFilters(
            @Param("ecosystemId") UUID ecosystemId,
            @Param("activeOnly") boolean activeOnly,
            @Param("queryPattern") String queryPattern
    );

    @Query("""
            select p
            from EcosystemExternalProduct p
            where p.ecosystem.id = :ecosystemId
              and (:activeOnly = false or p.active = true)
              and (:queryPattern = '' or lower(p.name) like :queryPattern)
            """)
    List<EcosystemExternalProduct> searchPublicCatalog(
            @Param("ecosystemId") UUID ecosystemId,
            @Param("activeOnly") boolean activeOnly,
            @Param("queryPattern") String queryPattern,
            Sort sort
    );

    @Query("""
            select p
            from EcosystemExternalProduct p
            where p.ecosystem.id = :ecosystemId
              and (:activeOnly = false or p.active = true)
              and (:queryPattern = '' or lower(p.name) like :queryPattern)
            """)
    Page<EcosystemExternalProduct> searchPublicCatalogPage(
            @Param("ecosystemId") UUID ecosystemId,
            @Param("activeOnly") boolean activeOnly,
            @Param("queryPattern") String queryPattern,
            Pageable pageable
    );

    @Query(value = """
            select p
            from EcosystemExternalProduct p
            where p.ecosystem.id = :ecosystemId
              and (:activeOnly = false or p.active = true)
              and lower(p.name) like :queryPattern
            order by
              case when lower(p.name) = :normalizedQuery then 0 else 1 end,
              case when lower(p.name) like :prefixPattern then 0 else 1 end,
              case when p.deliverySupported = true then 0 else 1 end,
              case when p.active = true then 0 else 1 end,
              p.createdAt desc,
              p.id asc
            """,
            countQuery = """
            select count(p)
            from EcosystemExternalProduct p
            where p.ecosystem.id = :ecosystemId
              and (:activeOnly = false or p.active = true)
              and lower(p.name) like :queryPattern
            """)
    Page<EcosystemExternalProduct> searchPublicCatalogByRelevancePage(
            @Param("ecosystemId") UUID ecosystemId,
            @Param("activeOnly") boolean activeOnly,
            @Param("normalizedQuery") String normalizedQuery,
            @Param("prefixPattern") String prefixPattern,
            @Param("queryPattern") String queryPattern,
            Pageable pageable
    );

    @Query("""
            select p
            from EcosystemExternalProduct p
            where p.ecosystem.id = :ecosystemId
              and (:activeOnly = false or p.active = true)
              and (:queryPattern = '' or lower(p.name) like :queryPattern)
              and p.deliverySupported = :deliverySupported
            """)
    List<EcosystemExternalProduct> searchPublicCatalogByDeliverySupported(
            @Param("ecosystemId") UUID ecosystemId,
            @Param("activeOnly") boolean activeOnly,
            @Param("queryPattern") String queryPattern,
            @Param("deliverySupported") boolean deliverySupported,
            Sort sort
    );

    @Query("""
            select p
            from EcosystemExternalProduct p
            where p.ecosystem.id = :ecosystemId
              and (:activeOnly = false or p.active = true)
              and (:queryPattern = '' or lower(p.name) like :queryPattern)
              and p.deliverySupported = :deliverySupported
            """)
    Page<EcosystemExternalProduct> searchPublicCatalogByDeliverySupportedPage(
            @Param("ecosystemId") UUID ecosystemId,
            @Param("activeOnly") boolean activeOnly,
            @Param("queryPattern") String queryPattern,
            @Param("deliverySupported") boolean deliverySupported,
            Pageable pageable
    );

    @Query(value = """
            select p
            from EcosystemExternalProduct p
            where p.ecosystem.id = :ecosystemId
              and (:activeOnly = false or p.active = true)
              and lower(p.name) like :queryPattern
              and p.deliverySupported = :deliverySupported
            order by
              case when lower(p.name) = :normalizedQuery then 0 else 1 end,
              case when lower(p.name) like :prefixPattern then 0 else 1 end,
              case when p.active = true then 0 else 1 end,
              p.createdAt desc,
              p.id asc
            """,
            countQuery = """
            select count(p)
            from EcosystemExternalProduct p
            where p.ecosystem.id = :ecosystemId
              and (:activeOnly = false or p.active = true)
              and lower(p.name) like :queryPattern
              and p.deliverySupported = :deliverySupported
            """)
    Page<EcosystemExternalProduct> searchPublicCatalogByDeliverySupportedRelevancePage(
            @Param("ecosystemId") UUID ecosystemId,
            @Param("activeOnly") boolean activeOnly,
            @Param("normalizedQuery") String normalizedQuery,
            @Param("prefixPattern") String prefixPattern,
            @Param("queryPattern") String queryPattern,
            @Param("deliverySupported") boolean deliverySupported,
            Pageable pageable
    );

    long countByEcosystem_IdAndActiveTrue(UUID ecosystemId);

    long countByEcosystem_IdAndActiveFalse(UUID ecosystemId);
}
