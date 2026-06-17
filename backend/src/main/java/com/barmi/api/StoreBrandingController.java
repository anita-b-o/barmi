package com.barmi.api;

import com.barmi.app.store.StoreBrandingService;
import com.barmi.app.store.StoreBrandingService.StoreBrandingDto;
import com.barmi.app.store.StoreBrandingService.StoreBrandingUpdateRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/store/branding")
public class StoreBrandingController {
    private final StoreBrandingService storeBrandingService;

    public StoreBrandingController(StoreBrandingService storeBrandingService) {
        this.storeBrandingService = storeBrandingService;
    }

    @GetMapping
    public ResponseEntity<StoreBrandingDto> get() {
        return ResponseEntity.ok(storeBrandingService.getCurrentBranding());
    }

    @PutMapping
    public ResponseEntity<StoreBrandingDto> update(@RequestBody StoreBrandingUpdateRequest request) {
        return ResponseEntity.ok(storeBrandingService.updateCurrentBranding(request));
    }
}
