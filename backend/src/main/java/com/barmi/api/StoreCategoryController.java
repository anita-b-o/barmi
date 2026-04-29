package com.barmi.api;

import com.barmi.app.catalog.StoreCategoryService;
import com.barmi.app.security.StoreAuthorizationService;
import com.barmi.domain.catalog.StoreCategory;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/store/categories")
public class StoreCategoryController {

    private final StoreCategoryService storeCategoryService;
    private final StoreAuthorizationService storeAuthorizationService;

    public StoreCategoryController(
            StoreCategoryService storeCategoryService,
            StoreAuthorizationService storeAuthorizationService
    ) {
        this.storeCategoryService = storeCategoryService;
        this.storeAuthorizationService = storeAuthorizationService;
    }

    public record CreateReq(
            @NotBlank String name,
            Integer sortOrder
    ) {}

    public record UpdateActiveReq(boolean active) {}

    public record StoreCategoryDto(
            UUID id,
            UUID storeId,
            String name,
            boolean active,
            int sortOrder,
            Instant createdAt
    ) {}

    @GetMapping
    public ResponseEntity<?> list() {
        storeAuthorizationService.requireAdmin();
        List<StoreCategory> categories = storeCategoryService.list();
        return ResponseEntity.ok(categories.stream().map(this::toDto).toList());
    }

    @PostMapping
    public ResponseEntity<?> create(@Valid @RequestBody CreateReq req) {
        storeAuthorizationService.requireAdmin();
        StoreCategory category = storeCategoryService.create(req.name(), req.sortOrder());
        return ResponseEntity.status(HttpStatus.CREATED).body(toDto(category));
    }

    @PatchMapping("/{categoryId}/active")
    public ResponseEntity<?> updateActive(@PathVariable UUID categoryId, @Valid @RequestBody UpdateActiveReq req) {
        storeAuthorizationService.requireAdmin();
        return ResponseEntity.ok(toDto(storeCategoryService.updateActive(categoryId, req.active())));
    }

    private StoreCategoryDto toDto(StoreCategory category) {
        return new StoreCategoryDto(
                category.getId(),
                category.getStoreId(),
                category.getName(),
                category.isActive(),
                category.getSortOrder(),
                category.getCreatedAt()
        );
    }
}
