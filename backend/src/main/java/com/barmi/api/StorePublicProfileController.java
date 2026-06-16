package com.barmi.api;

import com.barmi.app.store.StorePublicProfileService;
import com.barmi.app.store.StorePublicProfileService.StorePublicProfileDto;
import com.barmi.app.store.StorePublicProfileService.StorePublicProfileUpdateRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/store/profile")
public class StorePublicProfileController {
    private final StorePublicProfileService storePublicProfileService;

    public StorePublicProfileController(StorePublicProfileService storePublicProfileService) {
        this.storePublicProfileService = storePublicProfileService;
    }

    @GetMapping
    public ResponseEntity<StorePublicProfileDto> get() {
        return ResponseEntity.ok(storePublicProfileService.getCurrentProfile());
    }

    @PutMapping
    public ResponseEntity<StorePublicProfileDto> update(@RequestBody StorePublicProfileUpdateRequest request) {
        return ResponseEntity.ok(storePublicProfileService.updateCurrentProfile(request));
    }
}
