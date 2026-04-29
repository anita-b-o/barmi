package com.barmi.api;

import com.barmi.app.catalog.StorePromotionService;
import com.barmi.app.security.StoreAuthorizationService;
import com.barmi.domain.catalog.StorePromotion;
import com.barmi.domain.catalog.StorePromotionType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/store/promotions")
public class StorePromotionController {

    private final StorePromotionService storePromotionService;
    private final StoreAuthorizationService storeAuthorizationService;

    public StorePromotionController(
            StorePromotionService storePromotionService,
            StoreAuthorizationService storeAuthorizationService
    ) {
        this.storePromotionService = storePromotionService;
        this.storeAuthorizationService = storeAuthorizationService;
    }

    public record CreateReq(
            @NotBlank String code,
            @NotNull StorePromotionType type,
            @NotNull BigDecimal value,
            Boolean active,
            Instant expirationDate,
            Long usageLimit
    ) {}

    public record UpdateActiveReq(@NotNull Boolean active) {}

    public record StorePromotionDto(
            UUID id,
            UUID storeId,
            String code,
            StorePromotionType type,
            BigDecimal value,
            boolean active,
            Instant expirationDate,
            Long usageLimit,
            long usageCount,
            Instant createdAt
    ) {}

    @GetMapping
    public ResponseEntity<List<StorePromotionDto>> list() {
        storeAuthorizationService.requireAdmin();
        return ResponseEntity.ok(storePromotionService.list().stream().map(this::toDto).toList());
    }

    @PostMapping
    public ResponseEntity<StorePromotionDto> create(@Valid @RequestBody CreateReq req) {
        storeAuthorizationService.requireAdmin();
        StorePromotion promotion = storePromotionService.create(
                req.code(),
                req.type(),
                req.value(),
                req.active(),
                req.expirationDate(),
                req.usageLimit()
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(toDto(promotion));
    }

    @PatchMapping("/{promotionId}/active")
    public ResponseEntity<StorePromotionDto> updateActive(@PathVariable UUID promotionId, @Valid @RequestBody UpdateActiveReq req) {
        storeAuthorizationService.requireAdmin();
        return ResponseEntity.ok(toDto(storePromotionService.updateActive(promotionId, req.active())));
    }

    private StorePromotionDto toDto(StorePromotion promotion) {
        return new StorePromotionDto(
                promotion.getId(),
                promotion.getStoreId(),
                promotion.getCode(),
                promotion.getType(),
                promotion.getValueAmount(),
                promotion.isActive(),
                promotion.getExpirationDate(),
                promotion.getUsageLimit(),
                promotion.getUsageCount(),
                promotion.getCreatedAt()
        );
    }
}
