package com.barmi.api;

import com.barmi.domain.ecosystem.Ecosystem;
import com.barmi.domain.ecosystem.EcosystemExternalProduct;
import com.barmi.domain.ecosystem.EcosystemPromotion;
import com.barmi.domain.ecosystem.EcosystemPromotionType;
import com.barmi.domain.store.PublicStoreCategory;
import com.barmi.domain.store.Store;
import com.barmi.infra.repo.EcosystemExternalProductRepository;
import com.barmi.infra.repo.EcosystemPromotionRepository;
import com.barmi.infra.repo.EcosystemRepository;
import com.barmi.infra.repo.StoreRepository;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/public/ecosystems")
public class PublicEcosystemController {

    private final EcosystemRepository ecosystemRepository;
    private final EcosystemExternalProductRepository ecosystemExternalProductRepository;
    private final EcosystemPromotionRepository ecosystemPromotionRepository;
    private final StoreRepository storeRepository;

    public PublicEcosystemController(
            EcosystemRepository ecosystemRepository,
            EcosystemExternalProductRepository ecosystemExternalProductRepository,
            EcosystemPromotionRepository ecosystemPromotionRepository,
            StoreRepository storeRepository
    ) {
        this.ecosystemRepository = ecosystemRepository;
        this.ecosystemExternalProductRepository = ecosystemExternalProductRepository;
        this.ecosystemPromotionRepository = ecosystemPromotionRepository;
        this.storeRepository = storeRepository;
    }

    public record EcosystemPublicView(UUID id, String slug, String name, List<EcosystemPromotionPublicView> promotions) {}

    public record EcosystemHomePublicView(
            EcosystemPublicView ecosystem,
            List<StorePublicView> newStores,
            List<StoreCategoryFacetPublicView> storeCategories,
            List<EcosystemExternalProductPublicView> promotionProducts,
            List<EcosystemExternalProductPublicView> deliveryProducts
    ) {}

    public record StoreCategoryPublicView(String key, String label) {}

    public record StoreCategoryFacetPublicView(String key, String label, long storeCount) {}

    public record StorePublicView(UUID id, String slug, String name, StoreCategoryPublicView category, Instant createdAt) {}

    public record StoreMapPublicView(
            UUID id,
            String slug,
            String name,
            StoreCategoryPublicView category,
            boolean hasPublicLocation,
            String locationLabel,
            BigDecimal latitude,
            BigDecimal longitude,
            Instant createdAt
    ) {}

    public record EcosystemStoresMapPublicView(
            EcosystemPublicView ecosystem,
            List<StoreCategoryFacetPublicView> categories,
            List<StoreMapPublicView> stores
    ) {}

    public record EcosystemPromotionPublicView(
            String code,
            EcosystemPromotionType type,
            BigDecimal value,
            String shortLabel,
            Instant expirationDate
    ) {}

    public record EcosystemExternalProductPublicView(
            UUID id,
            String name,
            BigDecimal priceAmount,
            String currency,
            boolean deliverySupported
    ) {}

    @GetMapping("/{slug}")
    public ResponseEntity<?> getBySlug(@PathVariable String slug) {
        Ecosystem ecosystem = resolveActiveEcosystem(slug);
        return ResponseEntity.ok(new EcosystemPublicView(
                ecosystem.getId(),
                ecosystem.getSlug(),
                ecosystem.getName(),
                visiblePromotions(ecosystem).stream()
                        .map(this::toPublicPromotion)
                        .toList()
        ));
    }

    @GetMapping("/{slug}/home")
    public ResponseEntity<?> getHome(@PathVariable String slug) {
        Ecosystem ecosystem = resolveActiveEcosystem(slug);
        List<EcosystemPromotion> visiblePromotions = visiblePromotions(ecosystem);

        List<EcosystemExternalProductPublicView> promotionProducts = visiblePromotions.isEmpty()
                ? List.of()
                : searchPublicProducts(
                        ecosystem.getId(),
                        true,
                        "",
                        null,
                        Sort.by(Sort.Order.desc("createdAt"))
                ).stream()
                .limit(6)
                .map(this::toPublicProduct)
                .toList();

        List<EcosystemExternalProductPublicView> deliveryProducts = searchPublicProducts(
                        ecosystem.getId(),
                        true,
                        "",
                        true,
                        Sort.by(Sort.Order.desc("createdAt"))
                ).stream()
                .limit(6)
                .map(this::toPublicProduct)
                .toList();

        List<StorePublicView> newStores = storeRepository.findTop6ByActiveTrueAndEcosystem_IdOrderByCreatedAtDesc(ecosystem.getId()).stream()
                .map(this::toPublicStore)
                .toList();
        List<StoreCategoryFacetPublicView> categoryFacets = publicStoreCategories(ecosystem.getId());

        return ResponseEntity.ok(new EcosystemHomePublicView(
                new EcosystemPublicView(
                        ecosystem.getId(),
                        ecosystem.getSlug(),
                        ecosystem.getName(),
                        visiblePromotions.stream().map(this::toPublicPromotion).toList()
                ),
                newStores,
                categoryFacets,
                promotionProducts,
                deliveryProducts
        ));
    }

    @GetMapping("/{slug}/stores/map")
    public ResponseEntity<?> getStoresMap(
            @PathVariable String slug,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String query,
            @RequestParam(required = false) String category,
            @RequestParam(required = false, defaultValue = "mapped") String location,
            @RequestParam(required = false) String sort
    ) {
        Ecosystem ecosystem = resolveActiveEcosystem(slug);
        String rawQuery = (q != null && !q.isBlank()) ? q : query;
        String normalizedQuery = (rawQuery == null || rawQuery.isBlank()) ? "" : rawQuery.trim();
        String normalizedCategory = normalizeCategoryFilter(category);
        boolean mappedOnly = !"all".equalsIgnoreCase(location);
        List<StoreCategoryFacetPublicView> categoryFacets = publicStoreCategories(ecosystem.getId());

        List<StoreMapPublicView> stores = storeRepository.searchPublicStores(
                        ecosystem.getId(),
                        normalizedQuery,
                        normalizedCategory,
                        mappedOnly,
                        parsePublicStoreSort(sort)
                ).stream()
                .map(this::toPublicStoreMap)
                .toList();

        return ResponseEntity.ok(new EcosystemStoresMapPublicView(
                new EcosystemPublicView(
                        ecosystem.getId(),
                        ecosystem.getSlug(),
                        ecosystem.getName(),
                        visiblePromotions(ecosystem).stream().map(this::toPublicPromotion).toList()
                ),
                categoryFacets,
                stores
        ));
    }

    @GetMapping("/{slug}/products")
    public ResponseEntity<?> listProducts(
            @PathVariable String slug,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String query,
            @RequestParam(defaultValue = "true") boolean activeOnly,
            @RequestParam(required = false) Boolean deliverySupported,
            @RequestParam(required = false) String sort
    ) {
        Ecosystem ecosystem = resolveActiveEcosystem(slug);
        String rawQuery = (q != null && !q.isBlank()) ? q : query;
        String normalizedQuery = (rawQuery == null || rawQuery.isBlank()) ? "" : rawQuery.trim();
        List<EcosystemExternalProduct> products = searchPublicProducts(
                ecosystem.getId(),
                activeOnly,
                normalizedQuery,
                deliverySupported,
                parsePublicProductSort(sort)
        );

        List<EcosystemExternalProductPublicView> body = products.stream()
                .map(p -> new EcosystemExternalProductPublicView(
                        p.getId(),
                        p.getName(),
                        p.getPriceAmount(),
                        p.getCurrency(),
                        p.isDeliverySupported()
                ))
                .toList();

        return ResponseEntity.ok(body);
    }

    private List<EcosystemExternalProduct> searchPublicProducts(
            UUID ecosystemId,
            boolean activeOnly,
            String query,
            Boolean deliverySupported,
            Sort sort
    ) {
        if (deliverySupported == null) {
            return ecosystemExternalProductRepository.searchPublicCatalog(
                    ecosystemId,
                    activeOnly,
                    query,
                    sort
            );
        }

        return ecosystemExternalProductRepository.searchPublicCatalogByDeliverySupported(
                ecosystemId,
                activeOnly,
                query,
                deliverySupported,
                sort
        );
    }

    private Sort parsePublicProductSort(String sort) {
        if (sort == null || sort.isBlank()) {
            return Sort.by(Sort.Order.desc("createdAt"));
        }

        return switch (sort.trim()) {
            case "name,asc" -> Sort.by(Sort.Order.asc("name"), Sort.Order.desc("createdAt"));
            case "name,desc" -> Sort.by(Sort.Order.desc("name"), Sort.Order.desc("createdAt"));
            case "price,asc" -> Sort.by(Sort.Order.asc("priceAmount"), Sort.Order.desc("createdAt"));
            case "price,desc" -> Sort.by(Sort.Order.desc("priceAmount"), Sort.Order.desc("createdAt"));
            default -> Sort.by(Sort.Order.desc("createdAt"));
        };
    }

    private Sort parsePublicStoreSort(String sort) {
        if (sort == null || sort.isBlank()) {
            return Sort.by(Sort.Order.asc("name"), Sort.Order.desc("createdAt"));
        }

        return switch (sort.trim()) {
            case "name,desc" -> Sort.by(Sort.Order.desc("name"), Sort.Order.desc("createdAt"));
            case "recent" -> Sort.by(Sort.Order.desc("createdAt"), Sort.Order.asc("name"));
            default -> Sort.by(Sort.Order.asc("name"), Sort.Order.desc("createdAt"));
        };
    }

    private EcosystemPromotionPublicView toPublicPromotion(EcosystemPromotion promotion) {
        return new EcosystemPromotionPublicView(
                promotion.getCode(),
                promotion.getType(),
                promotion.getValueAmount(),
                buildShortLabel(promotion),
                promotion.getExpirationDate()
        );
    }

    private EcosystemExternalProductPublicView toPublicProduct(EcosystemExternalProduct product) {
        return new EcosystemExternalProductPublicView(
                product.getId(),
                product.getName(),
                product.getPriceAmount(),
                product.getCurrency(),
                product.isDeliverySupported()
        );
    }

    private StorePublicView toPublicStore(Store store) {
        return new StorePublicView(
                store.getId(),
                store.getSlug(),
                store.getName(),
                toPublicStoreCategory(store.getPublicCategoryKey()),
                store.getCreatedAt()
        );
    }

    private StoreMapPublicView toPublicStoreMap(Store store) {
        return new StoreMapPublicView(
                store.getId(),
                store.getSlug(),
                store.getName(),
                toPublicStoreCategory(store.getPublicCategoryKey()),
                store.hasPublicLocation(),
                store.getPublicLocationLabel(),
                store.getPublicLatitude(),
                store.getPublicLongitude(),
                store.getCreatedAt()
        );
    }

    private List<StoreCategoryFacetPublicView> publicStoreCategories(UUID ecosystemId) {
        return storeRepository.countPublicCategoriesForEcosystem(ecosystemId).stream()
                .map(item -> PublicStoreCategory.fromKey(item.getCategoryKey())
                        .map(category -> new StoreCategoryFacetPublicView(category.getKey(), category.getLabel(), item.getStoreCount()))
                        .orElse(null))
                .filter(java.util.Objects::nonNull)
                .sorted((left, right) -> {
                    int countOrder = Long.compare(right.storeCount(), left.storeCount());
                    if (countOrder != 0) {
                        return countOrder;
                    }
                    return left.label().compareToIgnoreCase(right.label());
                })
                .toList();
    }

    private StoreCategoryPublicView toPublicStoreCategory(String categoryKey) {
        return PublicStoreCategory.fromKey(categoryKey)
                .map(category -> new StoreCategoryPublicView(category.getKey(), category.getLabel()))
                .orElse(null);
    }

    private String normalizeCategoryFilter(String category) {
        if (category == null || category.isBlank()) {
            return "";
        }
        try {
            return PublicStoreCategory.normalizeKey(category);
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid_store_category");
        }
    }

    private List<EcosystemPromotion> visiblePromotions(Ecosystem ecosystem) {
        return ecosystemPromotionRepository.findVisiblePublicPromotions(ecosystem.getId(), Instant.now());
    }

    private String buildShortLabel(EcosystemPromotion promotion) {
        if (promotion.getType() == EcosystemPromotionType.PERCENTAGE) {
            return promotion.getCode() + " · " + stripZeros(promotion.getValueAmount()) + "% OFF";
        }
        return promotion.getCode() + " · " + stripZeros(promotion.getValueAmount()) + " ARS OFF";
    }

    private String stripZeros(BigDecimal value) {
        return value.stripTrailingZeros().toPlainString();
    }

    private Ecosystem resolveActiveEcosystem(String slug) {
        if (slug == null || slug.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "bad_request");
        }

        Ecosystem ecosystem = ecosystemRepository.findBySlug(slug)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "ecosystem_not_found"));

        if (!ecosystem.isActive()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "ecosystem_inactive");
        }

        return ecosystem;
    }
}
