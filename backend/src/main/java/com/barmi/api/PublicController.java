package com.barmi.api;

import com.barmi.app.tenant.TenantContext;
import com.barmi.domain.catalog.Product;
import com.barmi.domain.store.Store;
import com.barmi.infra.repo.ProductRepository;
import com.barmi.infra.repo.StoreRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/public")
public class PublicController {

    private final StoreRepository storeRepository;
    private final ProductRepository productRepository;

    public PublicController(StoreRepository storeRepository, ProductRepository productRepository) {
        this.storeRepository = storeRepository;
        this.productRepository = productRepository;
    }

    @GetMapping("/whoami")
    public Map<String, Object> whoAmI() {
        return Map.of("storeSlug", TenantContext.getStoreSlug());
    }

    @GetMapping("/stores/{slug}")
    public ResponseEntity<?> getStore(@PathVariable String slug) {
        return storeRepository.findBySlug(slug)
                .map(s -> ResponseEntity.ok(Map.of("id", s.getId(), "slug", s.getSlug(), "name", s.getName())))
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/stores/{slug}/products")
    public ResponseEntity<?> listStoreProducts(@PathVariable String slug) {
        Optional<Store> store = storeRepository.findBySlug(slug);
        if (store.isEmpty()) return ResponseEntity.notFound().build();

        List<Product> products = productRepository.findByStoreId(store.get().getId());
        List<Map<String, Object>> out = products.stream()
                .map(p -> Map.<String, Object>of(
                        "id", p.getId(),
                        "sku", p.getSku(),
                        "name", p.getName(),
                        "priceCents", p.getPriceCents()
                ))
                .toList();

        return ResponseEntity.ok(out);
    }
}
