package com.barmi.api;

import com.barmi.app.shipping.StoreShippingQuoteService;
import com.barmi.domain.shipping.StoreShippingZone;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/store/shipping")
public class StoreShippingController {

    private final StoreShippingQuoteService storeShippingQuoteService;

    public StoreShippingController(StoreShippingQuoteService storeShippingQuoteService) {
        this.storeShippingQuoteService = storeShippingQuoteService;
    }

    @GetMapping("/quote")
    public ResponseEntity<?> quote(@RequestParam String postalCode) {
        StoreShippingZone zone = storeShippingQuoteService.quote(postalCode);

        return ResponseEntity.ok(Map.of(
                "zoneId", zone.getId(),
                "type", zone.getType().name(),
                "postalCode", postalCode,
                "costAmount", zone.getCostAmount(),
                "currency", zone.getCurrency()
        ));
    }
}
