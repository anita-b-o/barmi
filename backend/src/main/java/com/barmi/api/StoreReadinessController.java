package com.barmi.api;

import com.barmi.app.store.StoreReadinessService;
import com.barmi.app.store.StoreReadinessService.StoreReadinessDto;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/store/readiness")
public class StoreReadinessController {

    private final StoreReadinessService storeReadinessService;

    public StoreReadinessController(StoreReadinessService storeReadinessService) {
        this.storeReadinessService = storeReadinessService;
    }

    @GetMapping
    public ResponseEntity<StoreReadinessDto> get() {
        return ResponseEntity.ok(storeReadinessService.getCurrentStoreReadiness());
    }
}
