package com.barmi.api;

import com.barmi.app.saas.SaasAdminService;
import com.barmi.app.saas.SaasAdminService.SaasSubscriptionAdminDto;
import com.barmi.domain.saas.SaasPlan;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/saas")
public class SaasAdminController {
    private final SaasAdminService saasAdminService;

    public SaasAdminController(SaasAdminService saasAdminService) {
        this.saasAdminService = saasAdminService;
    }

    public record UpsertPlanReq(
            @NotBlank String code,
            @NotBlank String name,
            Boolean active,
            String description,
            @NotNull @PositiveOrZero Integer maxProducts,
            @NotNull Boolean analyticsEnabled,
            @NotNull Boolean seoEnabled
    ) {}

    public record UpdatePlanReq(
            @NotBlank String name,
            @NotNull Boolean active,
            String description,
            @NotNull @PositiveOrZero Integer maxProducts,
            @NotNull Boolean analyticsEnabled,
            @NotNull Boolean seoEnabled
    ) {}

    public record ChangeStorePlanReq(UUID planId, String planCode, String status, Instant expiresAt) {}

    public record SaasPlanDto(
            UUID id,
            String code,
            String name,
            boolean active,
            String description,
            int maxProducts,
            boolean analyticsEnabled,
            boolean seoEnabled,
            Instant createdAt,
            Instant updatedAt
    ) {}

    @GetMapping("/plans")
    public ResponseEntity<List<SaasPlanDto>> listPlans() {
        return ResponseEntity.ok(saasAdminService.listPlans().stream().map(this::toDto).toList());
    }

    @PostMapping("/plans")
    public ResponseEntity<SaasPlanDto> createPlan(@Valid @RequestBody UpsertPlanReq req) {
        SaasPlan created = saasAdminService.createPlan(
                req.code(),
                req.name(),
                req.active(),
                req.description(),
                req.maxProducts(),
                req.analyticsEnabled(),
                req.seoEnabled()
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(toDto(created));
    }

    @PutMapping("/plans/{planId}")
    public ResponseEntity<SaasPlanDto> updatePlan(@PathVariable UUID planId, @Valid @RequestBody UpdatePlanReq req) {
        SaasPlan updated = saasAdminService.updatePlan(
                planId,
                req.name(),
                req.active(),
                req.description(),
                req.maxProducts(),
                req.analyticsEnabled(),
                req.seoEnabled()
        );
        return ResponseEntity.ok(toDto(updated));
    }

    @GetMapping("/subscriptions")
    public ResponseEntity<List<SaasSubscriptionAdminDto>> listSubscriptions() {
        return ResponseEntity.ok(saasAdminService.listSubscriptions());
    }

    @PatchMapping("/subscriptions/stores/{storeId}/plan")
    public ResponseEntity<SaasSubscriptionAdminDto> changeStorePlan(
            @PathVariable UUID storeId,
            @RequestBody ChangeStorePlanReq req
    ) {
        return ResponseEntity.ok(saasAdminService.changeStorePlan(
                storeId,
                req.planId(),
                req.planCode(),
                req.status(),
                req.expiresAt()
        ));
    }

    private SaasPlanDto toDto(SaasPlan plan) {
        return new SaasPlanDto(
                plan.getId(),
                plan.getCode(),
                plan.getName(),
                plan.isActive(),
                plan.getDescription(),
                plan.getMaxProducts(),
                plan.isAnalyticsEnabled(),
                plan.isSeoEnabled(),
                plan.getCreatedAt(),
                plan.getUpdatedAt()
        );
    }
}
