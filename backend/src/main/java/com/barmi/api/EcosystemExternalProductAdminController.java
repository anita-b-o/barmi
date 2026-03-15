package com.barmi.api;

import com.barmi.app.ecosystem.EcosystemExternalProductAdminService;
import com.barmi.app.security.EcosystemAuthorizationService;
import com.barmi.domain.ecosystem.EcosystemExternalProduct;
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
@RequestMapping("/api/ecosystem/admin/products")
public class EcosystemExternalProductAdminController {

    private final EcosystemExternalProductAdminService ecosystemExternalProductAdminService;
    private final EcosystemAuthorizationService ecosystemAuthorizationService;

    public EcosystemExternalProductAdminController(
            EcosystemExternalProductAdminService ecosystemExternalProductAdminService,
            EcosystemAuthorizationService ecosystemAuthorizationService
    ) {
        this.ecosystemExternalProductAdminService = ecosystemExternalProductAdminService;
        this.ecosystemAuthorizationService = ecosystemAuthorizationService;
    }

    public record CreateReq(
            @NotNull UUID ecosystemId,
            String name,
            BigDecimal priceAmount,
            String currency,
            Boolean deliverySupported,
            Boolean isActive
    ) {}

    public record UpdateReq(
            UUID ecosystemId,
            String name,
            BigDecimal priceAmount,
            String currency,
            Boolean deliverySupported,
            Boolean isActive
    ) {}

    public record EcosystemExternalProductDto(
            UUID id,
            UUID ecosystemId,
            String name,
            BigDecimal priceAmount,
            String currency,
            boolean deliverySupported,
            boolean isActive,
            Instant createdAt
    ) {}

    @PostMapping
    public ResponseEntity<?> create(@Valid @RequestBody CreateReq req) {
        ecosystemAuthorizationService.requireAdmin(req.ecosystemId());

        EcosystemExternalProduct product = ecosystemExternalProductAdminService.create(
                req.ecosystemId(),
                req.name(),
                req.priceAmount(),
                req.currency(),
                req.deliverySupported(),
                req.isActive()
        );

        return ResponseEntity.status(HttpStatus.CREATED).body(toDto(product));
    }

    @GetMapping
    public ResponseEntity<?> list(
            @RequestParam @NotNull UUID ecosystemId,
            @RequestParam(defaultValue = "true") boolean activeOnly,
            @RequestParam(required = false) String query
    ) {
        ecosystemAuthorizationService.requireAdmin(ecosystemId);
        List<EcosystemExternalProduct> products = ecosystemExternalProductAdminService
                .list(ecosystemId, activeOnly, query);
        return ResponseEntity.ok(products.stream().map(this::toDto).toList());
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> get(
            @PathVariable UUID id,
            @RequestParam @NotNull UUID ecosystemId
    ) {
        ecosystemAuthorizationService.requireAdmin(ecosystemId);
        EcosystemExternalProduct product = ecosystemExternalProductAdminService.get(id, ecosystemId);
        return ResponseEntity.ok(toDto(product));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateReq req
    ) {
        ecosystemAuthorizationService.requireAdmin(req.ecosystemId());

        EcosystemExternalProduct product = ecosystemExternalProductAdminService.update(
                id,
                req.ecosystemId(),
                req.name(),
                req.priceAmount(),
                req.currency(),
                req.deliverySupported(),
                req.isActive()
        );

        return ResponseEntity.ok(toDto(product));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(
            @PathVariable UUID id,
            @RequestParam @NotNull UUID ecosystemId
    ) {
        ecosystemAuthorizationService.requireAdmin(ecosystemId);
        EcosystemExternalProduct product = ecosystemExternalProductAdminService.softDelete(id, ecosystemId);
        return ResponseEntity.ok(toDto(product));
    }

    private EcosystemExternalProductDto toDto(EcosystemExternalProduct product) {
        return new EcosystemExternalProductDto(
                product.getId(),
                product.getEcosystem().getId(),
                product.getName(),
                product.getPriceAmount(),
                product.getCurrency(),
                product.isDeliverySupported(),
                product.isActive(),
                product.getCreatedAt()
        );
    }
}
