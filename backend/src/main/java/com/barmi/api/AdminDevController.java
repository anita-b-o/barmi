package com.barmi.api;

import com.barmi.app.saas.StoreSaasSubscriptionService;
import com.barmi.app.devdata.DemoSeedService;
import com.barmi.domain.catalog.Product;
import com.barmi.domain.store.Store;
import com.barmi.infra.repo.ProductRepository;
import com.barmi.infra.repo.StoreRepository;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

/**
 * DEV helper: seeds one store + product.
 * In production you will replace with real admin endpoints and auth/roles.
 */
@RestController
@Profile({"local", "dev", "test", "integrationtest"})
@RequestMapping("/api/admin/dev")
public class AdminDevController {

    private final StoreRepository storeRepository;
    private final ProductRepository productRepository;
    private final StoreSaasSubscriptionService storeSaasSubscriptionService;
    private final DemoSeedService demoSeedService;

    public AdminDevController(
            StoreRepository storeRepository,
            ProductRepository productRepository,
            StoreSaasSubscriptionService storeSaasSubscriptionService,
            DemoSeedService demoSeedService
    ) {
        this.storeRepository = storeRepository;
        this.productRepository = productRepository;
        this.storeSaasSubscriptionService = storeSaasSubscriptionService;
        this.demoSeedService = demoSeedService;
    }

    public record SeedStoreReq(@NotBlank String slug, @NotBlank String name) {}
    public record SeedProductReq(@NotBlank String storeSlug, @NotBlank String sku, @NotBlank String name, @Min(0) long priceCents) {}

    @PostMapping("/store")
    public ResponseEntity<?> seedStore(@RequestBody SeedStoreReq req) {
        Store s = new Store(UUID.randomUUID(), req.slug(), req.name());
        storeRepository.save(s);
        storeSaasSubscriptionService.ensureSubscriptionForStore(s.getId());
        return ResponseEntity.ok(Map.of("id", s.getId(), "slug", s.getSlug()));
    }

    @PostMapping("/product")
    public ResponseEntity<?> seedProduct(@RequestBody SeedProductReq req) {
        Store s = storeRepository.findBySlug(req.storeSlug()).orElseThrow();
        Product p = new Product(UUID.randomUUID(), s.getId(), req.sku(), req.name(), req.priceCents());
        productRepository.save(p);
        return ResponseEntity.ok(Map.of("id", p.getId(), "storeId", p.getStoreId()));
    }

    @GetMapping("/seeds")
    public ResponseEntity<?> listSeeds() {
        return ResponseEntity.ok(demoSeedService.listScenarios());
    }

    @PostMapping("/seeds/{scenario}")
    public ResponseEntity<?> seedScenario(@PathVariable String scenario) {
        return ResponseEntity.ok(demoSeedService.seed(scenario).toResponse());
    }
}
