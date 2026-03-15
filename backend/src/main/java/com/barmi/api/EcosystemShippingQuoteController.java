package com.barmi.api;

import com.barmi.app.ecosystem.EcosystemShippingQuoteService;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/ecosystem/shipping")
public class EcosystemShippingQuoteController {

    private final EcosystemShippingQuoteService ecosystemShippingQuoteService;

    public EcosystemShippingQuoteController(EcosystemShippingQuoteService ecosystemShippingQuoteService) {
        this.ecosystemShippingQuoteService = ecosystemShippingQuoteService;
    }

    @GetMapping("/quote")
    public ResponseEntity<?> quote(
            @RequestParam @NotNull UUID ecosystemId,
            @RequestParam @NotBlank String postalCode
    ) {
        EcosystemShippingQuoteService.QuoteResult result = ecosystemShippingQuoteService.quote(ecosystemId, postalCode);
        return ResponseEntity.ok(result);
    }
}
