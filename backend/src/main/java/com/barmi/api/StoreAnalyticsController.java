package com.barmi.api;

import com.barmi.app.analytics.StoreAnalyticsQueryService;
import com.barmi.app.security.StoreAuthorizationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/store/analytics")
public class StoreAnalyticsController {

    private final StoreAuthorizationService storeAuthorizationService;
    private final StoreAnalyticsQueryService storeAnalyticsQueryService;

    public StoreAnalyticsController(
            StoreAuthorizationService storeAuthorizationService,
            StoreAnalyticsQueryService storeAnalyticsQueryService
    ) {
        this.storeAuthorizationService = storeAuthorizationService;
        this.storeAnalyticsQueryService = storeAnalyticsQueryService;
    }

    @GetMapping("/summary")
    public ResponseEntity<?> summary() {
        storeAuthorizationService.requireAdmin();
        return ResponseEntity.ok(storeAnalyticsQueryService.summary());
    }

    @GetMapping("/report")
    public ResponseEntity<?> report(@RequestParam(required = false) String range) {
        storeAuthorizationService.requireAdmin();
        return ResponseEntity.ok(storeAnalyticsQueryService.report(range));
    }
}
