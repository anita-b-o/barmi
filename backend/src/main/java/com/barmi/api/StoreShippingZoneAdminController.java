package com.barmi.api;

import com.barmi.app.security.StoreAuthorizationService;
import com.barmi.app.shipping.StoreShippingZoneAdminService;
import com.barmi.domain.shipping.StoreShippingZone;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/store/shipping/zones")
public class StoreShippingZoneAdminController {

    private final StoreShippingZoneAdminService storeShippingZoneAdminService;
    private final StoreAuthorizationService storeAuthorizationService;

    public StoreShippingZoneAdminController(
            StoreShippingZoneAdminService storeShippingZoneAdminService,
            StoreAuthorizationService storeAuthorizationService
    ) {
        this.storeShippingZoneAdminService = storeShippingZoneAdminService;
        this.storeAuthorizationService = storeAuthorizationService;
    }

    public record CreateZoneReq(
            String type,
            String postalCode,
            Integer rangeStart,
            Integer rangeEnd,
            BigDecimal costAmount,
            String currency
    ) {}

    @PostMapping
    public ResponseEntity<?> create(@Valid @RequestBody CreateZoneReq req) {
        storeAuthorizationService.requireAdmin();

        StoreShippingZone zone = storeShippingZoneAdminService.createZone(
                req.type(),
                req.postalCode(),
                req.rangeStart(),
                req.rangeEnd(),
                req.costAmount(),
                req.currency()
        );

        return ResponseEntity.status(HttpStatus.CREATED).body(toDto(zone));
    }

    @GetMapping
    public ResponseEntity<?> list() {
        storeAuthorizationService.requireAdmin();
        List<StoreShippingZone> zones = storeShippingZoneAdminService.listZones();
        return ResponseEntity.ok(zones.stream().map(this::toDto).toList());
    }

    @DeleteMapping("/{zoneId}")
    public ResponseEntity<?> delete(@PathVariable UUID zoneId) {
        storeAuthorizationService.requireAdmin();
        storeShippingZoneAdminService.deleteZone(zoneId);
        return ResponseEntity.noContent().build();
    }

    private Map<String, Object> toDto(StoreShippingZone zone) {
        Map<String, Object> dto = new java.util.HashMap<>();
        dto.put("zoneId", zone.getId());
        dto.put("storeId", zone.getStoreId());
        dto.put("type", zone.getType().name());
        dto.put("postalCode", zone.getPostalCode());
        dto.put("rangeStart", zone.getRangeStart());
        dto.put("rangeEnd", zone.getRangeEnd());
        dto.put("costAmount", zone.getCostAmount());
        dto.put("currency", zone.getCurrency());
        dto.put("createdAt", zone.getCreatedAt());
        return dto;
    }
}
