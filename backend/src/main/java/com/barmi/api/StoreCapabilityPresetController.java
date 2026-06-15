package com.barmi.api;

import com.barmi.app.store.StoreCapabilityService;
import com.barmi.app.store.StoreCapabilityService.StoreCapabilitiesDto;
import com.barmi.app.store.StoreCapabilityService.StoreCapabilityPresetsDto;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/store/capability-presets")
public class StoreCapabilityPresetController {

    private final StoreCapabilityService storeCapabilityService;

    public StoreCapabilityPresetController(StoreCapabilityService storeCapabilityService) {
        this.storeCapabilityService = storeCapabilityService;
    }

    @GetMapping
    public ResponseEntity<StoreCapabilityPresetsDto> list() {
        return ResponseEntity.ok(storeCapabilityService.listCapabilityPresets());
    }

    @PostMapping("/{presetKey}/apply")
    public ResponseEntity<StoreCapabilitiesDto> apply(@PathVariable String presetKey) {
        return ResponseEntity.ok(storeCapabilityService.applyCapabilityPreset(presetKey));
    }
}
