package com.barmi.app.catalog;

import com.barmi.app.tenant.TenantContext;
import com.barmi.domain.catalog.StoreCategory;
import com.barmi.domain.store.Store;
import com.barmi.infra.repo.StoreCategoryRepository;
import com.barmi.infra.repo.StoreRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@Service
public class StoreCategoryService {

    private final StoreRepository storeRepository;
    private final StoreCategoryRepository storeCategoryRepository;

    public StoreCategoryService(
            StoreRepository storeRepository,
            StoreCategoryRepository storeCategoryRepository
    ) {
        this.storeRepository = storeRepository;
        this.storeCategoryRepository = storeCategoryRepository;
    }

    @Transactional(readOnly = true)
    public List<StoreCategory> list() {
        return storeCategoryRepository.findByStoreIdOrderBySortOrderAscNameAsc(resolveStore().getId());
    }

    @Transactional
    public StoreCategory create(String name, Integer sortOrder) {
        Store store = resolveStore();
        String normalizedName = validateName(name);
        int normalizedSortOrder = validateSortOrder(sortOrder);

        if (storeCategoryRepository.existsByStoreIdAndNameIgnoreCase(store.getId(), normalizedName)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "store_category_name_conflict");
        }

        return storeCategoryRepository.save(new StoreCategory(
                UUID.randomUUID(),
                store.getId(),
                normalizedName,
                true,
                normalizedSortOrder
        ));
    }

    @Transactional
    public StoreCategory updateActive(UUID categoryId, boolean active) {
        if (categoryId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "category_id_required");
        }
        Store store = resolveStore();
        StoreCategory category = storeCategoryRepository.findByIdAndStoreId(categoryId, store.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "store_category_not_found"));
        category.setActive(active);
        return storeCategoryRepository.save(category);
    }

    private Store resolveStore() {
        String storeSlug = TenantContext.getStoreSlug();
        if (storeSlug == null || storeSlug.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "store_context_required");
        }

        Store store = storeRepository.findBySlug(storeSlug)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "store_not_found"));

        if (!store.isActive()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "store_inactive");
        }

        return store;
    }

    private String validateName(String name) {
        if (name == null || name.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid_category_name");
        }
        return name.trim();
    }

    private int validateSortOrder(Integer sortOrder) {
        if (sortOrder == null) return 0;
        return sortOrder;
    }
}
