package com.barmi.api;

import com.barmi.domain.ecosystem.Ecosystem;
import com.barmi.domain.ecosystem.EcosystemExternalProduct;
import com.barmi.infra.repo.EcosystemExternalProductRepository;
import com.barmi.infra.repo.EcosystemRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/public/ecosystems")
public class PublicEcosystemController {

    private final EcosystemRepository ecosystemRepository;
    private final EcosystemExternalProductRepository ecosystemExternalProductRepository;

    public PublicEcosystemController(
            EcosystemRepository ecosystemRepository,
            EcosystemExternalProductRepository ecosystemExternalProductRepository
    ) {
        this.ecosystemRepository = ecosystemRepository;
        this.ecosystemExternalProductRepository = ecosystemExternalProductRepository;
    }

    public record EcosystemPublicView(UUID id, String slug, String name) {}

    public record EcosystemExternalProductPublicView(
            UUID id,
            String name,
            BigDecimal priceAmount,
            String currency,
            boolean deliverySupported
    ) {}

    @GetMapping("/{slug}")
    public ResponseEntity<?> getBySlug(@PathVariable String slug) {
        Ecosystem ecosystem = resolveActiveEcosystem(slug);
        return ResponseEntity.ok(new EcosystemPublicView(
                ecosystem.getId(),
                ecosystem.getSlug(),
                ecosystem.getName()
        ));
    }

    @GetMapping("/{slug}/products")
    public ResponseEntity<?> listProducts(
            @PathVariable String slug,
            @RequestParam(required = false) String query,
            @RequestParam(defaultValue = "true") boolean activeOnly
    ) {
        Ecosystem ecosystem = resolveActiveEcosystem(slug);
        String normalizedQuery = (query == null || query.isBlank()) ? null : query.trim();
        List<EcosystemExternalProduct> products = ecosystemExternalProductRepository
                .findByEcosystemWithFilters(ecosystem.getId(), activeOnly, normalizedQuery);

        List<EcosystemExternalProductPublicView> body = products.stream()
                .map(p -> new EcosystemExternalProductPublicView(
                        p.getId(),
                        p.getName(),
                        p.getPriceAmount(),
                        p.getCurrency(),
                        p.isDeliverySupported()
                ))
                .toList();

        return ResponseEntity.ok(body);
    }

    private Ecosystem resolveActiveEcosystem(String slug) {
        if (slug == null || slug.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "bad_request");
        }

        Ecosystem ecosystem = ecosystemRepository.findBySlug(slug)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "ecosystem_not_found"));

        if (!ecosystem.isActive()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "ecosystem_inactive");
        }

        return ecosystem;
    }
}
