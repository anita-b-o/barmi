package com.barmi.api;

import com.barmi.app.store.StoreAppearanceService;
import com.barmi.app.store.StoreAppearanceService.StoreAppearanceDto;
import com.barmi.app.store.StoreAppearanceService.StoreAppearanceUpdateRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/store/appearance")
public class StoreAppearanceController {
    private final StoreAppearanceService storeAppearanceService;

    public StoreAppearanceController(StoreAppearanceService storeAppearanceService) {
        this.storeAppearanceService = storeAppearanceService;
    }

    @GetMapping
    public ResponseEntity<StoreAppearanceDto> get() {
        return ResponseEntity.ok(storeAppearanceService.getCurrentAppearance());
    }

    @PutMapping
    public ResponseEntity<StoreAppearanceDto> update(@RequestBody StoreAppearanceUpdateRequest request) {
        return ResponseEntity.ok(storeAppearanceService.updateCurrentAppearance(request));
    }
}
