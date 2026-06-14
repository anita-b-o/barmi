package com.barmi.api;

import com.barmi.domain.ecosystem.Ecosystem;
import com.barmi.domain.store.PublicStoreCategory;
import com.barmi.domain.store.Store;
import com.barmi.infra.repo.EcosystemRepository;
import com.barmi.infra.repo.ProductRepository;
import com.barmi.infra.repo.StoreRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.Optional;

@RestController
public class PublicSeoController {

    private final EcosystemRepository ecosystemRepository;
    private final StoreRepository storeRepository;
    private final ProductRepository productRepository;
    private final String publicEcosystemSlug;
    private final String publicBaseUrl;

    public PublicSeoController(
            EcosystemRepository ecosystemRepository,
            StoreRepository storeRepository,
            ProductRepository productRepository,
            @Value("${app.seo.publicEcosystemSlug:demo-ecosystem}") String publicEcosystemSlug,
            @Value("${app.seo.publicBaseUrl:}") String publicBaseUrl
    ) {
        this.ecosystemRepository = ecosystemRepository;
        this.storeRepository = storeRepository;
        this.productRepository = productRepository;
        this.publicEcosystemSlug = publicEcosystemSlug;
        this.publicBaseUrl = publicBaseUrl;
    }

    @GetMapping(value = "/robots.txt", produces = MediaType.TEXT_PLAIN_VALUE)
    public ResponseEntity<String> robots(HttpServletRequest request) {
        String origin = resolveOrigin(request);
        String body = """
                User-agent: *
                Allow: /
                Disallow: /admin
                Disallow: /auth
                Disallow: /store/checkout
                Disallow: /store/orders
                Disallow: /ecosystem/checkout
                Disallow: /ecosystem/orders

                Sitemap: %s/sitemap.xml
                """.formatted(origin);

        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(Duration.ofHours(1)).cachePublic())
                .body(body);
    }

    @GetMapping(value = "/sitemap.xml", produces = MediaType.APPLICATION_XML_VALUE)
    public ResponseEntity<String> sitemap(HttpServletRequest request) {
        String origin = resolveOrigin(request);
        StringBuilder xml = new StringBuilder();
        xml.append("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
        xml.append("<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n");

        Optional<Ecosystem> ecosystem = ecosystemRepository.findBySlug(publicEcosystemSlug)
                .filter(Ecosystem::isActive);
        if (ecosystem.isPresent()) {
            appendUrl(xml, origin + "/ecosystem");
            appendUrl(xml, origin + "/ecosystem/catalog");

            List<Store> stores = storeRepository.findByActiveTrueAndEcosystem_SlugOrderBySlugAsc(publicEcosystemSlug);
            stores.forEach(store -> appendUrl(xml, origin + "/public/" + encodePathSegment(store.getSlug())));

            productRepository.findPublicSitemapProducts(publicEcosystemSlug)
                    .forEach(product -> appendUrl(
                            xml,
                            origin + "/public/" + encodePathSegment(product.getStoreSlug())
                                    + "/products/" + encodePathSegment(product.getProductSlug())
                    ));

            storeRepository.countPublicCategoriesForEcosystem(ecosystem.get().getId()).stream()
                    .filter(category -> category.getStoreCount() > 0)
                    .map(category -> PublicStoreCategory.fromKey(category.getCategoryKey()).orElse(null))
                    .filter(java.util.Objects::nonNull)
                    .sorted(java.util.Comparator.comparing(PublicStoreCategory::getKey))
                    .forEach(category -> appendUrl(xml, origin + "/ecosystem/categories/" + encodePathSegment(category.getKey())));
        }

        xml.append("</urlset>\n");

        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(Duration.ofHours(1)).cachePublic())
                .body(xml.toString());
    }

    private void appendUrl(StringBuilder xml, String location) {
        xml.append("  <url><loc>")
                .append(escapeXml(location))
                .append("</loc></url>\n");
    }

    private String resolveOrigin(HttpServletRequest request) {
        if (publicBaseUrl != null && !publicBaseUrl.isBlank()) {
            return trimTrailingSlash(publicBaseUrl.trim());
        }

        String forwardedProto = request.getHeader("X-Forwarded-Proto");
        String forwardedHost = request.getHeader("X-Forwarded-Host");
        String scheme = forwardedProto == null || forwardedProto.isBlank() ? request.getScheme() : forwardedProto.split(",")[0].trim();
        String host = forwardedHost == null || forwardedHost.isBlank() ? request.getServerName() : forwardedHost.split(",")[0].trim();
        int port = request.getServerPort();
        boolean defaultPort = ("http".equalsIgnoreCase(scheme) && port == 80) || ("https".equalsIgnoreCase(scheme) && port == 443);
        String portSegment = defaultPort || forwardedHost != null && !forwardedHost.isBlank() ? "" : ":" + port;
        return trimTrailingSlash(scheme + "://" + host + portSegment);
    }

    private String trimTrailingSlash(String value) {
        return value.replaceAll("/+$", "");
    }

    private String encodePathSegment(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8)
                .replace("+", "%20");
    }

    private String escapeXml(String value) {
        return value
                .replace("&", "&amp;")
                .replace("\"", "&quot;")
                .replace("'", "&apos;")
                .replace("<", "&lt;")
                .replace(">", "&gt;");
    }
}
