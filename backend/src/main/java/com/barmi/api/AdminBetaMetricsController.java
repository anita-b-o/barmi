package com.barmi.api;

import com.barmi.app.beta.BetaMetricsQueryService;
import com.barmi.app.beta.BetaLaunchToolkitService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/beta")
public class AdminBetaMetricsController {

    private final BetaMetricsQueryService betaMetricsQueryService;
    private final BetaLaunchToolkitService betaLaunchToolkitService;

    public AdminBetaMetricsController(
            BetaMetricsQueryService betaMetricsQueryService,
            BetaLaunchToolkitService betaLaunchToolkitService
    ) {
        this.betaMetricsQueryService = betaMetricsQueryService;
        this.betaLaunchToolkitService = betaLaunchToolkitService;
    }

    @GetMapping("/summary")
    public ResponseEntity<?> summary() {
        return ResponseEntity.ok(betaMetricsQueryService.summary());
    }

    @GetMapping("/stores")
    public ResponseEntity<?> stores() {
        return ResponseEntity.ok(betaLaunchToolkitService.stores());
    }
}
