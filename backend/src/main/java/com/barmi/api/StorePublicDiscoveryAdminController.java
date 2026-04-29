package com.barmi.api;

import com.barmi.app.store.StorePublicDiscoveryAdminService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.UUID;

@RestController
@RequestMapping("/api/store/admin/discovery")
public class StorePublicDiscoveryAdminController {

    public record UpdateReq(
            UUID ecosystemId,
            String publicCategoryKey,
            @Size(max = 255) String publicLocationLabel,
            BigDecimal publicLatitude,
            BigDecimal publicLongitude
    ) {}

    private final StorePublicDiscoveryAdminService storePublicDiscoveryAdminService;

    public StorePublicDiscoveryAdminController(StorePublicDiscoveryAdminService storePublicDiscoveryAdminService) {
        this.storePublicDiscoveryAdminService = storePublicDiscoveryAdminService;
    }

    @GetMapping
    public ResponseEntity<?> getCurrent() {
        return ResponseEntity.ok(storePublicDiscoveryAdminService.getCurrentSettings());
    }

    @PutMapping
    public ResponseEntity<?> update(@Valid @RequestBody UpdateReq req) {
        return ResponseEntity.ok(storePublicDiscoveryAdminService.updateCurrentSettings(
                req.ecosystemId(),
                req.publicCategoryKey(),
                req.publicLocationLabel(),
                req.publicLatitude(),
                req.publicLongitude()
        ));
    }
}
