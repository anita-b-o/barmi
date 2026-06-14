package com.barmi.infra.repo;

import com.barmi.domain.store.StoreCapability;
import com.barmi.domain.store.StoreCapabilitySetting;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface StoreCapabilitySettingRepository extends JpaRepository<StoreCapabilitySetting, UUID> {
    List<StoreCapabilitySetting> findAllByStoreIdOrderByCapabilityAsc(UUID storeId);
    Optional<StoreCapabilitySetting> findByStoreIdAndCapability(UUID storeId, StoreCapability capability);
    long countByStoreIdAndCapabilityIn(UUID storeId, Collection<StoreCapability> capabilities);
}
