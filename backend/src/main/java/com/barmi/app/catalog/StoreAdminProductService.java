package com.barmi.app.catalog;

import com.barmi.app.tenant.TenantContext;
import com.barmi.domain.catalog.Product;
import com.barmi.domain.catalog.StoreCategory;
import com.barmi.domain.store.Store;
import com.barmi.infra.repo.ProductRepository;
import com.barmi.infra.repo.StoreCategoryRepository;
import com.barmi.infra.repo.StoreRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@Service
public class StoreAdminProductService {

    private final StoreRepository storeRepository;
    private final ProductRepository productRepository;
    private final StoreCategoryRepository storeCategoryRepository;

    public StoreAdminProductService(
            StoreRepository storeRepository,
            ProductRepository productRepository,
            StoreCategoryRepository storeCategoryRepository
    ) {
        this.storeRepository = storeRepository;
        this.productRepository = productRepository;
        this.storeCategoryRepository = storeCategoryRepository;
    }

    @Transactional(readOnly = true)
    public List<Product> list() {
        Store store = resolveStore();
        return productRepository.findByStoreIdOrderByCreatedAtAsc(store.getId());
    }

    @Transactional(readOnly = true)
    public Product get(UUID productId) {
        if (productId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "product_id_required");
        }
        Store store = resolveStore();
        return productRepository.findByIdAndStoreId(productId, store.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "product_not_found"));
    }

    @Transactional
    public Product create(String sku, String name, Long priceCents, Long stockQuantity, UUID categoryId) {
        Store store = resolveStore();
        String normalizedSku = validateSku(sku);
        String normalizedName = validateName(name);
        long normalizedPriceCents = validatePriceCents(priceCents);
        long normalizedStockQuantity = validateStockQuantity(stockQuantity);
        UUID normalizedCategoryId = validateCategoryId(categoryId, store.getId());

        if (productRepository.existsByStoreIdAndSku(store.getId(), normalizedSku)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "product_sku_conflict");
        }

        Product product = new Product(
                UUID.randomUUID(),
                store.getId(),
                normalizedSku,
                normalizedName,
                normalizedPriceCents,
                normalizedStockQuantity,
                normalizedCategoryId
        );
        return productRepository.save(product);
    }

    @Transactional
    public Product update(UUID productId, String sku, String name, Long priceCents, Long stockQuantity, UUID categoryId) {
        if (productId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "product_id_required");
        }
        Store store = resolveStore();
        Product product = productRepository.findByIdAndStoreId(productId, store.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "product_not_found"));

        String normalizedSku = validateSku(sku);
        String normalizedName = validateName(name);
        long normalizedPriceCents = validatePriceCents(priceCents);
        long normalizedStockQuantity = validateStockQuantity(stockQuantity);
        UUID normalizedCategoryId = validateCategoryId(categoryId, store.getId());

        if (productRepository.existsByStoreIdAndSkuAndIdNot(store.getId(), normalizedSku, productId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "product_sku_conflict");
        }

        product.updateSku(normalizedSku);
        product.updateName(normalizedName);
        product.updatePriceCents(normalizedPriceCents);
        product.updateStockQuantity(normalizedStockQuantity);
        product.updateCategoryId(normalizedCategoryId);
        return productRepository.save(product);
    }

    @Transactional
    public Product softDelete(UUID productId) {
        if (productId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "product_id_required");
        }
        Store store = resolveStore();
        Product product = productRepository.findByIdAndStoreId(productId, store.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "product_not_found"));

        product.setActive(false);
        return productRepository.save(product);
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

    private String validateSku(String sku) {
        if (sku == null || sku.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid_sku");
        }
        return sku.trim();
    }

    private String validateName(String name) {
        if (name == null || name.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid_name");
        }
        return name.trim();
    }

    private long validatePriceCents(Long priceCents) {
        if (priceCents == null || priceCents < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid_price_cents");
        }
        return priceCents;
    }

    private long validateStockQuantity(Long stockQuantity) {
        if (stockQuantity == null || stockQuantity < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid_stock_quantity");
        }
        return stockQuantity;
    }

    private UUID validateCategoryId(UUID categoryId, UUID storeId) {
        if (categoryId == null) {
            return null;
        }
        StoreCategory category = storeCategoryRepository.findByIdAndStoreId(categoryId, storeId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid_category_id"));
        return category.getId();
    }
}
