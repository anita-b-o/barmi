package com.barmi.api;

import com.barmi.domain.catalog.StorePromotion;
import com.barmi.domain.catalog.StorePromotionType;
import com.barmi.domain.catalog.StoreCategory;
import com.barmi.app.store.StoreCapabilityService;
import com.barmi.app.tenant.TenantContext;
import com.barmi.domain.catalog.Product;
import com.barmi.domain.store.Store;
import com.barmi.domain.store.PublicStoreCategory;
import com.barmi.infra.repo.ProductRepository;
import com.barmi.infra.repo.StoreCategoryRepository;
import com.barmi.infra.repo.StorePromotionRepository;
import com.barmi.infra.repo.StoreRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;

@RestController
@RequestMapping("/api/public")
public class PublicController {
    private static final int DEFAULT_PUBLIC_PRODUCT_PAGE = 0;
    private static final int DEFAULT_PUBLIC_PRODUCT_PAGE_SIZE = 20;
    private static final int MAX_PUBLIC_PRODUCT_PAGE_SIZE = 100;

    private final StoreRepository storeRepository;
    private final ProductRepository productRepository;
    private final StorePromotionRepository storePromotionRepository;
    private final StoreCategoryRepository storeCategoryRepository;
    private final StoreCapabilityService storeCapabilityService;
    private final String defaultCurrency;

    public PublicController(
            StoreRepository storeRepository,
            ProductRepository productRepository,
            StorePromotionRepository storePromotionRepository,
            StoreCategoryRepository storeCategoryRepository,
            StoreCapabilityService storeCapabilityService,
            @Value("${app.money.defaultCurrency:ARS}") String defaultCurrency
    ) {
        this.storeRepository = storeRepository;
        this.productRepository = productRepository;
        this.storePromotionRepository = storePromotionRepository;
        this.storeCategoryRepository = storeCategoryRepository;
        this.storeCapabilityService = storeCapabilityService;
        this.defaultCurrency = defaultCurrency == null || defaultCurrency.isBlank() ? "ARS" : defaultCurrency.trim().toUpperCase(Locale.ROOT);
    }

    @GetMapping("/whoami")
    public Map<String, Object> whoAmI() {
        return Map.of("storeSlug", TenantContext.getStoreSlug());
    }

    @GetMapping("/stores/{slug}")
    public ResponseEntity<?> getStore(@PathVariable String slug) {
        return storeRepository.findBySlug(slug)
                .map(s -> {
                    List<StoreCategory> publicCategories = storeCategoryRepository.findByStoreIdAndActiveTrueOrderBySortOrderAscNameAsc(s.getId());
                    return ResponseEntity.ok(Map.<String, Object>of(
                            "id", s.getId(),
                            "slug", s.getSlug(),
                            "name", s.getName(),
                            "capabilities", storeCapabilityService.getEnabledCapabilityNamesForStore(s.getId()),
                            "categories", publicCategories.stream().map(this::toPublicCategory).toList(),
                            "promotions", storePromotionRepository.findVisiblePublicPromotions(s.getId(), Instant.now()).stream()
                                    .map(this::toPublicPromotion)
                                    .toList()
                    ));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/stores/{slug}/products")
    public ResponseEntity<?> listStoreProducts(
            @PathVariable String slug,
            @RequestParam(required = false) String q,
            @RequestParam(required = false, defaultValue = "false") boolean availableOnly,
            @RequestParam(required = false) UUID categoryId,
            @RequestParam(required = false) String sort,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size
    ) {
        Optional<Store> store = storeRepository.findBySlug(slug);
        if (store.isEmpty()) return ResponseEntity.notFound().build();

        String normalizedQuery = q == null || q.isBlank() ? "" : q.trim();
        boolean paginated = page != null || size != null;
        Map<UUID, StoreCategory> visibleCategories = storeCategoryRepository.findByStoreIdAndActiveTrueOrderBySortOrderAscNameAsc(store.get().getId())
                .stream()
                .collect(java.util.stream.Collectors.toMap(StoreCategory::getId, category -> category));
        if (categoryId != null && !visibleCategories.containsKey(categoryId)) {
            if (!paginated) {
                return ResponseEntity.ok(List.of());
            }
            int resolvedPage = page == null ? DEFAULT_PUBLIC_PRODUCT_PAGE : page;
            int resolvedSize = size == null ? DEFAULT_PUBLIC_PRODUCT_PAGE_SIZE : size;
            ResponseEntity<?> invalidPagination = validatePublicProductPagination(resolvedPage, resolvedSize);
            if (invalidPagination != null) return invalidPagination;
            int cappedSize = Math.min(resolvedSize, MAX_PUBLIC_PRODUCT_PAGE_SIZE);
            return ResponseEntity.ok(publicProductsPage(List.of(), resolvedPage, cappedSize, 0, 0));
        }
        Sort publicProductSort = parsePublicProductSort(sort);
        if (paginated) {
            int resolvedPage = page == null ? DEFAULT_PUBLIC_PRODUCT_PAGE : page;
            int resolvedSize = size == null ? DEFAULT_PUBLIC_PRODUCT_PAGE_SIZE : size;
            ResponseEntity<?> invalidPagination = validatePublicProductPagination(resolvedPage, resolvedSize);
            if (invalidPagination != null) return invalidPagination;
            int cappedSize = Math.min(resolvedSize, MAX_PUBLIC_PRODUCT_PAGE_SIZE);
            Page<Product> products = productRepository.searchPublicCatalogPage(
                    store.get().getId(),
                    normalizedQuery,
                    availableOnly,
                    categoryId,
                    PageRequest.of(resolvedPage, cappedSize, publicProductSort)
            );
            List<Map<String, Object>> content = products.stream()
                    .map(product -> toPublicProduct(product, visibleCategories))
                    .toList();
            return ResponseEntity.ok(publicProductsPage(
                    content,
                    products.getNumber(),
                    products.getSize(),
                    products.getTotalElements(),
                    products.getTotalPages()
            ));
        }
        List<Product> products = productRepository.searchPublicCatalog(
                store.get().getId(),
                normalizedQuery,
                availableOnly,
                categoryId,
                publicProductSort
        );
        List<Map<String, Object>> out = products.stream()
                .map(product -> toPublicProduct(product, visibleCategories))
                .toList();

        return ResponseEntity.ok(out);
    }

    @GetMapping("/stores/{slug}/products/{productSlug}")
    public ResponseEntity<?> getStoreProductDetail(
            @PathVariable String slug,
            @PathVariable String productSlug
    ) {
        Optional<Store> store = storeRepository.findBySlug(slug)
                .filter(Store::isActive);
        if (store.isEmpty()) return ResponseEntity.notFound().build();

        String normalizedProductSlug = productSlug == null ? "" : productSlug.trim().toLowerCase(Locale.ROOT);
        if (normalizedProductSlug.isBlank()) return ResponseEntity.notFound().build();

        Optional<Product> product = productRepository.findByStoreIdAndPublicSlugAndActiveTrue(
                store.get().getId(),
                normalizedProductSlug
        );
        if (product.isEmpty()) return ResponseEntity.notFound().build();

        StoreCategory category = product.get().getCategoryId() == null
                ? null
                : storeCategoryRepository.findByIdAndStoreId(product.get().getCategoryId(), store.get().getId())
                .filter(StoreCategory::isActive)
                .orElse(null);

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("store", toPublicProductDetailStore(store.get()));
        payload.put("product", toPublicProductDetail(product.get(), category));
        return ResponseEntity.ok(payload);
    }

    private Sort parsePublicProductSort(String sort) {
        if (sort == null || sort.isBlank()) {
            return Sort.by(Sort.Order.asc("createdAt"), Sort.Order.asc("id"));
        }

        return switch (sort.trim()) {
            case "name,asc" -> Sort.by(Sort.Order.asc("name"), Sort.Order.asc("createdAt"), Sort.Order.asc("id"));
            case "name,desc" -> Sort.by(Sort.Order.desc("name"), Sort.Order.asc("createdAt"), Sort.Order.asc("id"));
            case "price,asc" -> Sort.by(Sort.Order.asc("priceCents"), Sort.Order.asc("createdAt"), Sort.Order.asc("id"));
            case "price,desc" -> Sort.by(Sort.Order.desc("priceCents"), Sort.Order.asc("createdAt"), Sort.Order.asc("id"));
            default -> Sort.by(Sort.Order.asc("createdAt"), Sort.Order.asc("id"));
        };
    }

    private ResponseEntity<?> validatePublicProductPagination(int page, int size) {
        if (page < 0 || size < 1) {
            return ResponseEntity.badRequest().build();
        }
        return null;
    }

    private Map<String, Object> publicProductsPage(
            List<Map<String, Object>> content,
            int page,
            int size,
            long totalElements,
            int totalPages
    ) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("content", content);
        payload.put("page", page);
        payload.put("size", size);
        payload.put("totalElements", totalElements);
        payload.put("totalPages", totalPages);
        return payload;
    }

    private Map<String, Object> toPublicProduct(Product product, Map<UUID, StoreCategory> visibleCategories) {
        StoreCategory category = product.getCategoryId() == null ? null : visibleCategories.get(product.getCategoryId());
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("id", product.getId());
        payload.put("slug", product.getPublicSlug());
        payload.put("sku", product.getSku());
        payload.put("name", product.getName());
        payload.put("priceCents", product.getPriceCents());
        payload.put("stockQuantity", product.getStockQuantity());
        payload.put("isAvailable", product.isAvailable());
        payload.put("categoryId", category == null ? null : category.getId());
        payload.put("categoryName", category == null ? null : category.getName());
        return payload;
    }

    private Map<String, Object> toPublicProductDetailStore(Store store) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("slug", store.getSlug());
        payload.put("name", store.getName());
        payload.put("categoryName", PublicStoreCategory.fromKey(store.getPublicCategoryKey())
                .map(PublicStoreCategory::getLabel)
                .orElse(null));
        return payload;
    }

    private Map<String, Object> toPublicProductDetail(Product product, StoreCategory category) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("slug", product.getPublicSlug());
        payload.put("name", product.getName());
        payload.put("priceCents", product.getPriceCents());
        payload.put("currency", defaultCurrency);
        payload.put("isAvailable", product.isAvailable());
        payload.put("stockQuantity", product.getStockQuantity());
        payload.put("categoryName", category == null ? null : category.getName());
        payload.put("description", null);
        payload.put("imageUrl", null);
        payload.put("sku", product.getSku());
        return payload;
    }

    private Map<String, Object> toPublicPromotion(StorePromotion promotion) {
        return Map.of(
                "code", promotion.getCode(),
                "type", promotion.getType(),
                "value", promotion.getValueAmount(),
                "shortLabel", buildShortLabel(promotion),
                "expirationDate", promotion.getExpirationDate()
        );
    }

    private Map<String, Object> toPublicCategory(StoreCategory category) {
        return Map.of(
                "id", category.getId(),
                "name", category.getName(),
                "sortOrder", category.getSortOrder()
        );
    }

    private String buildShortLabel(StorePromotion promotion) {
        if (promotion.getType() == StorePromotionType.PERCENTAGE) {
            return promotion.getCode() + " · " + stripZeros(promotion.getValueAmount()) + "% OFF";
        }
        return promotion.getCode() + " · " + stripZeros(promotion.getValueAmount()) + " ARS OFF";
    }

    private String stripZeros(BigDecimal value) {
        return value.stripTrailingZeros().toPlainString();
    }
}
