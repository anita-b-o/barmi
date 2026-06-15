package com.barmi.infra.repo;

import com.barmi.domain.shipping.ShippingZoneType;
import com.barmi.domain.shipping.StoreShippingZone;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface StoreShippingZoneRepository extends JpaRepository<StoreShippingZone, UUID> {

    Optional<StoreShippingZone> findByStoreIdAndTypeAndPostalCode(UUID storeId, ShippingZoneType type, String postalCode);

    boolean existsByStoreId(UUID storeId);

    List<StoreShippingZone> findByStoreIdOrderByCreatedAtAsc(UUID storeId);

    @Query("select z from StoreShippingZone z where z.storeId = :storeId and z.type = :type and z.rangeStart <= :postalCode and z.rangeEnd >= :postalCode")
    List<StoreShippingZone> findRangeByStoreIdAndPostalCodeNumeric(
            @Param("storeId") UUID storeId,
            @Param("type") ShippingZoneType type,
            @Param("postalCode") int postalCode
    );
}
