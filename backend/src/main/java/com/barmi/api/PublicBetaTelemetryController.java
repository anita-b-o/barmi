package com.barmi.api;

import com.barmi.app.beta.BetaFeedbackRequest;
import com.barmi.app.beta.BetaFeedbackService;
import com.barmi.app.beta.BetaTelemetryIngestRequest;
import com.barmi.app.beta.BetaTelemetryService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/public/beta")
public class PublicBetaTelemetryController {

    private final BetaTelemetryService betaTelemetryService;
    private final BetaFeedbackService betaFeedbackService;

    public PublicBetaTelemetryController(BetaTelemetryService betaTelemetryService, BetaFeedbackService betaFeedbackService) {
        this.betaTelemetryService = betaTelemetryService;
        this.betaFeedbackService = betaFeedbackService;
    }

    @PostMapping("/telemetry")
    public ResponseEntity<?> ingestTelemetry(@RequestBody BetaTelemetryIngestRequest request) {
        betaTelemetryService.ingest(request);
        return ResponseEntity.accepted().body(Map.of("accepted", true));
    }

    @PostMapping("/feedback")
    public ResponseEntity<?> submitFeedback(@RequestBody BetaFeedbackRequest request) {
        betaFeedbackService.submit(request);
        return ResponseEntity.accepted().body(Map.of("accepted", true));
    }
}
