package com.barmi.infra.repo;

import com.barmi.domain.ecosystem.EcosystemExternalProduct;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface EcosystemExternalProductRepository extends JpaRepository<EcosystemExternalProduct, UUID> {

    Optional<EcosystemExternalProduct> findByIdAndEcosystem_Id(UUID id, UUID ecosystemId);

    @Query("select p from EcosystemExternalProduct p where p.ecosystem.id = :ecosystemId and (:activeOnly = false or p.active = true) and (:query is null or lower(p.name) like lower(concat('%', :query, '%'))) order by p.createdAt desc")
    List<EcosystemExternalProduct> findByEcosystemWithFilters(
            @Param("ecosystemId") UUID ecosystemId,
            @Param("activeOnly") boolean activeOnly,
            @Param("query") String query
    );
}
