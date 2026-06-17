package com.barmi.infra.repo;

import com.barmi.domain.catalog.StoreCategory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface StoreCategoryRepository extends JpaRepository<StoreCategory, UUID> {
    List<StoreCategory> findByStoreIdOrderBySortOrderAscNameAsc(UUID storeId);
    List<StoreCategory> findByStoreIdAndActiveTrueOrderBySortOrderAscNameAsc(UUID storeId);
    Optional<StoreCategory> findByIdAndStoreId(UUID id, UUID storeId);
    Optional<StoreCategory> findByStoreIdAndNameIgnoreCase(UUID storeId, String name);
    boolean existsByStoreIdAndNameIgnoreCase(UUID storeId, String name);
    boolean existsByStoreIdAndNameIgnoreCaseAndIdNot(UUID storeId, String name, UUID id);
    List<StoreCategory> findByStoreIdAndIdIn(UUID storeId, Collection<UUID> ids);
}
