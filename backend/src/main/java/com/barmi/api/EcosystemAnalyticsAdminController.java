package com.barmi.api;

import com.barmi.app.analytics.EcosystemAnalyticsQueryService;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/ecosystem/admin/analytics")
public class EcosystemAnalyticsAdminController {

    private final EcosystemAnalyticsQueryService ecosystemAnalyticsQueryService;

    public EcosystemAnalyticsAdminController(EcosystemAnalyticsQueryService ecosystemAnalyticsQueryService) {
        this.ecosystemAnalyticsQueryService = ecosystemAnalyticsQueryService;
    }

    @GetMapping("/summary")
    public ResponseEntity<?> summary(@RequestParam @NotNull UUID ecosystemId) {
        return ResponseEntity.ok(ecosystemAnalyticsQueryService.summary(ecosystemId));
    }

    @GetMapping("/report")
    public ResponseEntity<?> report(
            @RequestParam @NotNull UUID ecosystemId,
            @RequestParam(required = false) String range
    ) {
        return ResponseEntity.ok(ecosystemAnalyticsQueryService.report(ecosystemId, range));
    }
}
