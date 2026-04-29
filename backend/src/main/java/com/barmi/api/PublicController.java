package com.barmi.api;

import com.barmi.domain.catalog.StorePromotion;
import com.barmi.domain.catalog.StorePromotionType;
import com.barmi.domain.catalog.StoreCategory;
import com.barmi.app.tenant.TenantContext;
import com.barmi.domain.catalog.Product;
import com.barmi.domain.store.Store;
import com.barmi.infra.repo.ProductRepository;
import com.barmi.infra.repo.StoreCategoryRepository;
import com.barmi.infra.repo.StorePromotionRepository;
import com.barmi.infra.repo.StoreRepository;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;

@RestController
@RequestMapping("/api/public")
public class PublicController {

    private final StoreRepository storeRepository;
    private final ProductRepository productRepository;
    private final StorePromotionRepository storePromotionRepository;
    private final StoreCategoryRepository storeCategoryRepository;

    public PublicController(
            StoreRepository storeRepository,
            ProductRepository productRepository,
            StorePromotionRepository storePromotionRepository,
            StoreCategoryRepository storeCategoryRepository
    ) {
        this.storeRepository = storeRepository;
        this.productRepository = productRepository;
        this.storePromotionRepository = storePromotionRepository;
        this.storeCategoryRepository = storeCategoryRepository;
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
            @RequestParam(required = false) String sort
    ) {
        Optional<Store> store = storeRepository.findBySlug(slug);
        if (store.isEmpty()) return ResponseEntity.notFound().build();

        String normalizedQuery = q == null || q.isBlank() ? "" : q.trim();
        Map<UUID, StoreCategory> visibleCategories = storeCategoryRepository.findByStoreIdAndActiveTrueOrderBySortOrderAscNameAsc(store.get().getId())
                .stream()
                .collect(java.util.stream.Collectors.toMap(StoreCategory::getId, category -> category));
        if (categoryId != null && !visibleCategories.containsKey(categoryId)) {
            return ResponseEntity.ok(List.of());
        }
        List<Product> products = productRepository.searchPublicCatalog(
                store.get().getId(),
                normalizedQuery,
                availableOnly,
                categoryId,
                parsePublicProductSort(sort)
        );
        List<Map<String, Object>> out = products.stream()
                .map(p -> {
                    StoreCategory category = p.getCategoryId() == null ? null : visibleCategories.get(p.getCategoryId());
                    Map<String, Object> payload = new LinkedHashMap<>();
                    payload.put("id", p.getId());
                    payload.put("sku", p.getSku());
                    payload.put("name", p.getName());
                    payload.put("priceCents", p.getPriceCents());
                    payload.put("stockQuantity", p.getStockQuantity());
                    payload.put("isAvailable", p.isAvailable());
                    payload.put("categoryId", category == null ? null : category.getId());
                    payload.put("categoryName", category == null ? null : category.getName());
                    return payload;
                })
                .toList();

        return ResponseEntity.ok(out);
    }

    private Sort parsePublicProductSort(String sort) {
        if (sort == null || sort.isBlank()) {
            return Sort.by(Sort.Order.asc("createdAt"));
        }

        return switch (sort.trim()) {
            case "name,asc" -> Sort.by(Sort.Order.asc("name"), Sort.Order.asc("createdAt"));
            case "name,desc" -> Sort.by(Sort.Order.desc("name"), Sort.Order.asc("createdAt"));
            case "price,asc" -> Sort.by(Sort.Order.asc("priceCents"), Sort.Order.asc("createdAt"));
            case "price,desc" -> Sort.by(Sort.Order.desc("priceCents"), Sort.Order.asc("createdAt"));
            default -> Sort.by(Sort.Order.asc("createdAt"));
        };
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
