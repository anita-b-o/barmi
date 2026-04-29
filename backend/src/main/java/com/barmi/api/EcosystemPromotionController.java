package com.barmi.api;

import com.barmi.app.ecosystem.EcosystemPromotionService;
import com.barmi.app.security.EcosystemAuthorizationService;
import com.barmi.domain.ecosystem.EcosystemPromotion;
import com.barmi.domain.ecosystem.EcosystemPromotionType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/ecosystem/admin/promotions")
public class EcosystemPromotionController {

    private final EcosystemPromotionService ecosystemPromotionService;
    private final EcosystemAuthorizationService ecosystemAuthorizationService;

    public EcosystemPromotionController(
            EcosystemPromotionService ecosystemPromotionService,
            EcosystemAuthorizationService ecosystemAuthorizationService
    ) {
        this.ecosystemPromotionService = ecosystemPromotionService;
        this.ecosystemAuthorizationService = ecosystemAuthorizationService;
    }

    public record CreateReq(
            @NotNull UUID ecosystemId,
            @NotNull String code,
            @NotNull EcosystemPromotionType type,
            @NotNull BigDecimal value,
            Boolean active,
            Instant expirationDate,
            Long usageLimit
    ) {}

    public record UpdateActiveReq(@NotNull UUID ecosystemId, boolean active) {}

    public record EcosystemPromotionDto(
            UUID id,
            UUID ecosystemId,
            String code,
            EcosystemPromotionType type,
            BigDecimal value,
            boolean active,
            Instant expirationDate,
            Long usageLimit,
            long usageCount,
            Instant createdAt
    ) {}

    @GetMapping
    public ResponseEntity<List<EcosystemPromotionDto>> list(@RequestParam @NotNull UUID ecosystemId) {
        ecosystemAuthorizationService.requireAdmin(ecosystemId);
        return ResponseEntity.ok(ecosystemPromotionService.list(ecosystemId).stream().map(this::toDto).toList());
    }

    @PostMapping
    public ResponseEntity<EcosystemPromotionDto> create(@Valid @RequestBody CreateReq req) {
        ecosystemAuthorizationService.requireAdmin(req.ecosystemId());
        EcosystemPromotion promotion = ecosystemPromotionService.create(
                req.ecosystemId(),
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
    public ResponseEntity<EcosystemPromotionDto> updateActive(@PathVariable UUID promotionId, @Valid @RequestBody UpdateActiveReq req) {
        ecosystemAuthorizationService.requireAdmin(req.ecosystemId());
        return ResponseEntity.ok(toDto(ecosystemPromotionService.updateActive(req.ecosystemId(), promotionId, req.active())));
    }

    private EcosystemPromotionDto toDto(EcosystemPromotion promotion) {
        return new EcosystemPromotionDto(
                promotion.getId(),
                promotion.getEcosystemId(),
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
