package com.barmi.api;

import com.barmi.app.ecosystem.EcosystemShippingZoneAdminService;
import com.barmi.app.ecosystem.EcosystemShippingZoneAdminService.EcosystemShippingZoneDto;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/ecosystem/admin/shipping/zones")
public class EcosystemShippingZoneAdminController {

    private final EcosystemShippingZoneAdminService ecosystemShippingZoneAdminService;

    public EcosystemShippingZoneAdminController(EcosystemShippingZoneAdminService ecosystemShippingZoneAdminService) {
        this.ecosystemShippingZoneAdminService = ecosystemShippingZoneAdminService;
    }

    public record CreateZoneReq(
            UUID ecosystemId,
            String type,
            String postalCode,
            Integer rangeStart,
            Integer rangeEnd,
            BigDecimal costAmount,
            String currency
    ) {}

    @GetMapping
    public ResponseEntity<List<EcosystemShippingZoneDto>> list(@RequestParam(required = false) UUID ecosystemId) {
        return ResponseEntity.ok(ecosystemShippingZoneAdminService.list(ecosystemId));
    }

    @PostMapping
    public ResponseEntity<EcosystemShippingZoneDto> create(@RequestBody CreateZoneReq req) {
        EcosystemShippingZoneDto dto = ecosystemShippingZoneAdminService.create(
                req.ecosystemId(),
                req.type(),
                req.postalCode(),
                req.rangeStart(),
                req.rangeEnd(),
                req.costAmount(),
                req.currency()
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(dto);
    }

    @DeleteMapping("/{zoneId}")
    public ResponseEntity<EcosystemShippingZoneDto> delete(
            @PathVariable UUID zoneId,
            @RequestParam(required = false) UUID ecosystemId
    ) {
        return ResponseEntity.ok(ecosystemShippingZoneAdminService.softDelete(zoneId, ecosystemId));
    }
}
