package com.barmi.api;

import com.barmi.app.store.StoreCapabilityService;
import com.barmi.app.store.StoreCapabilityService.StoreCapabilitiesDto;
import com.barmi.app.store.StoreCapabilityService.StoreCapabilitiesUpdateRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/store/capabilities")
public class StoreCapabilityController {

    private final StoreCapabilityService storeCapabilityService;

    public StoreCapabilityController(StoreCapabilityService storeCapabilityService) {
        this.storeCapabilityService = storeCapabilityService;
    }

    @GetMapping
    public ResponseEntity<StoreCapabilitiesDto> get() {
        return ResponseEntity.ok(storeCapabilityService.getCurrentStoreCapabilities());
    }

    @PutMapping
    public ResponseEntity<StoreCapabilitiesDto> update(@RequestBody StoreCapabilitiesUpdateRequest request) {
        return ResponseEntity.ok(storeCapabilityService.updateCurrentStoreCapabilities(request.enabled()));
    }
}
