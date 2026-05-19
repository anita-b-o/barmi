package com.barmi.api;

import com.barmi.app.beta.BetaMetricsQueryService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/beta")
public class AdminBetaMetricsController {

    private final BetaMetricsQueryService betaMetricsQueryService;

    public AdminBetaMetricsController(BetaMetricsQueryService betaMetricsQueryService) {
        this.betaMetricsQueryService = betaMetricsQueryService;
    }

    @GetMapping("/summary")
    public ResponseEntity<?> summary() {
        return ResponseEntity.ok(betaMetricsQueryService.summary());
    }
}
