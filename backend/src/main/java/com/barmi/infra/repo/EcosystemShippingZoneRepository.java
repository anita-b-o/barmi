package com.barmi.infra.repo;

import com.barmi.domain.shipping.EcosystemShippingZone;
import com.barmi.domain.shipping.EcosystemShippingZoneType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface EcosystemShippingZoneRepository extends JpaRepository<EcosystemShippingZone, UUID> {

    @Query("select z from EcosystemShippingZone z where z.ecosystem.id = :ecosystemId and z.active = true order by z.createdAt asc")
    List<EcosystemShippingZone> findByEcosystemIdAndIsActiveTrueOrderByCreatedAtAsc(@Param("ecosystemId") UUID ecosystemId);

    @Query("select z from EcosystemShippingZone z where z.id = :zoneId and z.ecosystem.id = :ecosystemId")
    Optional<EcosystemShippingZone> findByIdAndEcosystemId(
            @Param("zoneId") UUID zoneId,
            @Param("ecosystemId") UUID ecosystemId
    );

    @Query("select z from EcosystemShippingZone z where z.ecosystem.id = :ecosystemId and z.type = :type and z.postalCode = :postalCode and z.active = true")
    Optional<EcosystemShippingZone> findExactActive(
            @Param("ecosystemId") UUID ecosystemId,
            @Param("type") EcosystemShippingZoneType type,
            @Param("postalCode") String postalCode
    );

    @Query("select z from EcosystemShippingZone z where z.ecosystem.id = :ecosystemId and z.type = :type and z.active = true and z.rangeStart <= :postalCode and z.rangeEnd >= :postalCode order by z.rangeStart asc, z.rangeEnd asc, z.id asc")
    List<EcosystemShippingZone> findRangeActive(
            @Param("ecosystemId") UUID ecosystemId,
            @Param("type") EcosystemShippingZoneType type,
            @Param("postalCode") int postalCode
    );
}
