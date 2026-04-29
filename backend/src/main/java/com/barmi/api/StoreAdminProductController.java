package com.barmi.api;

import com.barmi.app.catalog.StoreAdminProductService;
import com.barmi.app.security.StoreAuthorizationService;
import com.barmi.domain.catalog.Product;
import com.barmi.domain.catalog.StoreCategory;
import com.barmi.infra.repo.StoreCategoryRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/store/products")
public class StoreAdminProductController {

    private final StoreAdminProductService storeAdminProductService;
    private final StoreAuthorizationService storeAuthorizationService;
    private final StoreCategoryRepository storeCategoryRepository;

    public StoreAdminProductController(
            StoreAdminProductService storeAdminProductService,
            StoreAuthorizationService storeAuthorizationService,
            StoreCategoryRepository storeCategoryRepository
    ) {
        this.storeAdminProductService = storeAdminProductService;
        this.storeAuthorizationService = storeAuthorizationService;
        this.storeCategoryRepository = storeCategoryRepository;
    }

    public record CreateReq(
            @NotNull String sku,
            @NotNull String name,
            @NotNull Long priceCents,
            @NotNull Long stockQuantity,
            UUID categoryId
    ) {}

    public record UpdateReq(
            @NotNull String sku,
            @NotNull String name,
            @NotNull Long priceCents,
            @NotNull Long stockQuantity,
            UUID categoryId
    ) {}

    public record StoreAdminProductDto(
            UUID id,
            UUID storeId,
            String sku,
            String name,
            long priceCents,
            long stockQuantity,
            UUID categoryId,
            String categoryName,
            boolean isActive,
            boolean isAvailable,
            Instant createdAt
    ) {}

    @GetMapping
    public ResponseEntity<?> list() {
        storeAuthorizationService.requireAdmin();
        List<Product> products = storeAdminProductService.list();
        return ResponseEntity.ok(products.stream().map(this::toDto).toList());
    }

    @PostMapping
    public ResponseEntity<?> create(@Valid @RequestBody CreateReq req) {
        storeAuthorizationService.requireAdmin();
        Product product = storeAdminProductService.create(req.sku(), req.name(), req.priceCents(), req.stockQuantity(), req.categoryId());
        return ResponseEntity.status(HttpStatus.CREATED).body(toDto(product));
    }

    @GetMapping("/{productId}")
    public ResponseEntity<?> get(@PathVariable UUID productId) {
        storeAuthorizationService.requireAdmin();
        return ResponseEntity.ok(toDto(storeAdminProductService.get(productId)));
    }

    @PutMapping("/{productId}")
    public ResponseEntity<?> update(@PathVariable UUID productId, @Valid @RequestBody UpdateReq req) {
        storeAuthorizationService.requireAdmin();
        Product product = storeAdminProductService.update(productId, req.sku(), req.name(), req.priceCents(), req.stockQuantity(), req.categoryId());
        return ResponseEntity.ok(toDto(product));
    }

    @DeleteMapping("/{productId}")
    public ResponseEntity<?> delete(@PathVariable UUID productId) {
        storeAuthorizationService.requireAdmin();
        Product product = storeAdminProductService.softDelete(productId);
        return ResponseEntity.ok(toDto(product));
    }

    private StoreAdminProductDto toDto(Product product) {
        StoreCategory category = product.getCategoryId() == null
                ? null
                : storeCategoryRepository.findById(product.getCategoryId()).orElse(null);
        return new StoreAdminProductDto(
                product.getId(),
                product.getStoreId(),
                product.getSku(),
                product.getName(),
                product.getPriceCents(),
                product.getStockQuantity(),
                product.getCategoryId(),
                category == null ? null : category.getName(),
                product.isActive(),
                product.isAvailable(),
                product.getCreatedAt()
        );
    }
}
