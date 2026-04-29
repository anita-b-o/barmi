package com.barmi.orders;

import com.barmi.domain.catalog.Product;
import com.barmi.domain.catalog.StorePromotion;
import com.barmi.domain.catalog.StorePromotionType;
import com.barmi.domain.store.Store;
import com.barmi.infra.repo.OutboxEventRepository;
import com.barmi.infra.repo.ProductRepository;
import com.barmi.infra.repo.StoreOrderRepository;
import com.barmi.infra.repo.StorePromotionRepository;
import com.barmi.infra.repo.StoreRepository;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.TestConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.time.Instant;
import java.math.BigDecimal;


import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase.Replace.NONE;

@Testcontainers
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "jwt.secret=this_is_a_super_long_test_secret_key_that_is_at_least_32_bytes_long",
        "app.money.defaultCurrency=ARS"
})
@TestConstructor(autowireMode = TestConstructor.AutowireMode.ALL)
@ActiveProfiles("integrationtest")
@AutoConfigureTestDatabase(replace = NONE)
class StoreCheckoutControllerIT {

    @Container
    static PostgreSQLContainer<?> postgres =
            new PostgreSQLContainer<>("postgres:15.6")
                    .withDatabaseName("barmi_test")
                    .withUsername("test")
                    .withPassword("test");

    @DynamicPropertySource
    static void registerProps(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);

        registry.add("spring.flyway.url", postgres::getJdbcUrl);
        registry.add("spring.flyway.user", postgres::getUsername);
        registry.add("spring.flyway.password", postgres::getPassword);
    }

    private final TestRestTemplate restTemplate;
    private final StoreRepository storeRepository;
    private final ProductRepository productRepository;
    private final StoreOrderRepository storeOrderRepository;
    private final OutboxEventRepository outboxEventRepository;
    private final StorePromotionRepository storePromotionRepository;

    @LocalServerPort
    private int port;

@Autowired
    StoreCheckoutControllerIT(
            TestRestTemplate restTemplate,
            StoreRepository storeRepository,
            ProductRepository productRepository,
            StoreOrderRepository storeOrderRepository,
            OutboxEventRepository outboxEventRepository,
            StorePromotionRepository storePromotionRepository
    ) {
        this.restTemplate = restTemplate;
        this.storeRepository = storeRepository;
        this.productRepository = productRepository;
        this.storeOrderRepository = storeOrderRepository;
        this.outboxEventRepository = outboxEventRepository;
        this.storePromotionRepository = storePromotionRepository;
    }

    @Test
    void checkoutCreatesOrderAndOutbox() {
        Store store = storeRepository.save(new Store(UUID.randomUUID(), "cafe", "Cafe"));
        Product p1 = productRepository.save(new Product(UUID.randomUUID(), store.getId(), "SKU1", "Latte", 500));
        Product p2 = productRepository.save(new Product(UUID.randomUUID(), store.getId(), "SKU2", "Mocha", 700));

        Map<String, Object> body = Map.of(
                "buyerEmail", "guest@example.com",
                "items", List.of(
                        Map.of("productId", p1.getId().toString(), "qty", 2),
                        Map.of("productId", p2.getId().toString(), "qty", 1)
                )
        );

        HttpHeaders headers = new HttpHeaders();
        headers.set("Host", "cafe.example.com");
        headers.set("X-Forwarded-Host", "cafe.example.com");
        HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);

        ResponseEntity<Map> response = restTemplate.exchange(
                "http://localhost:" + port + "/api/store/checkout",
                HttpMethod.POST,
                request,
                Map.class
        );

        assertThat(response.getStatusCode().value()).isEqualTo(201);
        assertThat(response.getBody()).containsKeys("orderId", "subtotalAmount", "totalAmount");
        assertThat(response.getBody().get("currency")).isEqualTo("ARS");
        assertThat(response.getBody().get("shippingCostAmount").toString()).isEqualTo("0");

        String orderId = response.getBody().get("orderId").toString();
        assertThat(storeOrderRepository.findById(UUID.fromString(orderId))).isPresent();
        assertThat(storeOrderRepository.findById(UUID.fromString(orderId)).orElseThrow().getBuyerEmail()).isEqualTo("guest@example.com");
        assertThat(outboxEventRepository.findByAggregateIdAndEventType(UUID.fromString(orderId), "STORE_ORDER_CREATED"))
                .hasSize(1);
    }

    @Test
    void checkoutWithMissingProductReturnsNotFound() {
        Store store = storeRepository.save(new Store(UUID.randomUUID(), "cafe2", "Cafe2"));
        productRepository.save(new Product(UUID.randomUUID(), store.getId(), "SKU9", "Cortado", 400));

        Map<String, Object> body = Map.of(
                "items", List.of(
                        Map.of("productId", UUID.randomUUID().toString(), "qty", 1)
                )
        );

        HttpHeaders headers = new HttpHeaders();
        headers.set("Host", "cafe2.example.com");
        headers.set("X-Forwarded-Host", "cafe2.example.com");
        HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);

        ResponseEntity<Map> response = restTemplate.exchange(
                "http://localhost:" + port + "/api/store/checkout",
                HttpMethod.POST,
                request,
                Map.class
        );

        assertThat(response.getStatusCode().value()).isEqualTo(404);
        assertThat(response.getBody()).containsKey("error");
        Map<String, Object> error = (Map<String, Object>) response.getBody().get("error");
        assertThat(error.get("code")).isEqualTo("product_not_found");
        assertThat(error.get("status")).isEqualTo(404);
    }

    @Test
    void checkoutRejectsQuantityAboveStock() {
        Store store = storeRepository.save(new Store(UUID.randomUUID(), "cafe3", "Cafe3"));
        Product p1 = productRepository.save(new Product(UUID.randomUUID(), store.getId(), "SKU-STOCK", "Latte", 500, 2));

        Map<String, Object> body = Map.of(
                "items", List.of(
                        Map.of("productId", p1.getId().toString(), "qty", 3)
                )
        );

        HttpHeaders headers = new HttpHeaders();
        headers.set("Host", "cafe3.example.com");
        headers.set("X-Forwarded-Host", "cafe3.example.com");
        HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);

        ResponseEntity<Map> response = restTemplate.exchange(
                "http://localhost:" + port + "/api/store/checkout",
                HttpMethod.POST,
                request,
                Map.class
        );

        assertThat(response.getStatusCode().value()).isEqualTo(409);
        assertThat(response.getBody()).containsKey("error");
        Map<String, Object> error = (Map<String, Object>) response.getBody().get("error");
        assertThat(error.get("code")).isEqualTo("product_out_of_stock");
        assertThat(error.get("status")).isEqualTo(409);
    }

    @Test
    void checkoutAppliesCouponAndPersistsDiscountAmounts() {
        String slug = "promo-store-" + UUID.randomUUID();
        Store store = storeRepository.save(new Store(UUID.randomUUID(), slug, "Promo Store"));
        Product product = productRepository.save(new Product(UUID.randomUUID(), store.getId(), "SKU-PROMO", "Promo", 1000));
        storePromotionRepository.save(new StorePromotion(
                UUID.randomUUID(),
                store.getId(),
                "BIENVENIDA10",
                StorePromotionType.PERCENTAGE,
                new java.math.BigDecimal("10.00"),
                true,
                null,
                10L
        ));

        Map<String, Object> body = Map.of(
                "buyerEmail", "promo@example.com",
                "items", List.of(Map.of("productId", product.getId().toString(), "qty", 2)),
                "couponCode", "bienvenida10"
        );

        HttpHeaders headers = new HttpHeaders();
        headers.set("Host", slug + ".example.com");
        headers.set("X-Forwarded-Host", slug + ".example.com");

        ResponseEntity<Map> response = restTemplate.exchange(
                "http://localhost:" + port + "/api/store/checkout",
                HttpMethod.POST,
                new HttpEntity<>(body, headers),
                Map.class
        );

        assertThat(response.getStatusCode().value()).isEqualTo(201);
        assertThat(new BigDecimal(response.getBody().get("subtotalAmount").toString())).isEqualByComparingTo("20.00");
        assertThat(new BigDecimal(response.getBody().get("originalAmount").toString())).isEqualByComparingTo("20.00");
        assertThat(new BigDecimal(response.getBody().get("discountAmount").toString())).isEqualByComparingTo("2.00");
        assertThat(new BigDecimal(response.getBody().get("totalAmount").toString())).isEqualByComparingTo("18.00");
        assertThat(response.getBody().get("appliedCouponCode")).isEqualTo("BIENVENIDA10");

        UUID orderId = UUID.fromString(response.getBody().get("orderId").toString());
        var storedOrder = storeOrderRepository.findById(orderId).orElseThrow();
        assertThat(storedOrder.getOriginalAmount()).isEqualByComparingTo("20.00");
        assertThat(storedOrder.getDiscountAmount()).isEqualByComparingTo("2.00");
        assertThat(storedOrder.getTotalAmount()).isEqualByComparingTo("18.00");
        assertThat(storedOrder.getAppliedCouponCode()).isEqualTo("BIENVENIDA10");
        assertThat(storedOrder.getBuyerEmail()).isEqualTo("promo@example.com");
        assertThat(storedOrder.getPromotionConsumedAt()).isNull();
        assertThat(storePromotionRepository.findByStoreIdAndCode(store.getId(), "BIENVENIDA10").orElseThrow().getUsageCount()).isZero();
    }

    @Test
    void checkoutRejectsExpiredCoupon() {
        String slug = "expired-coupon-store-" + UUID.randomUUID();
        Store store = storeRepository.save(new Store(UUID.randomUUID(), slug, "Expired Coupon Store"));
        Product product = productRepository.save(new Product(UUID.randomUUID(), store.getId(), "SKU-EXP", "Promo", 1000));
        storePromotionRepository.save(new StorePromotion(
                UUID.randomUUID(),
                store.getId(),
                "VENCIDO",
                StorePromotionType.FIXED,
                new java.math.BigDecimal("5.00"),
                true,
                Instant.parse("2026-03-01T00:00:00Z"),
                null
        ));

        Map<String, Object> body = Map.of(
                "items", List.of(Map.of("productId", product.getId().toString(), "qty", 1)),
                "couponCode", "VENCIDO"
        );

        HttpHeaders headers = new HttpHeaders();
        headers.set("Host", slug + ".example.com");
        headers.set("X-Forwarded-Host", slug + ".example.com");

        ResponseEntity<Map> response = restTemplate.exchange(
                "http://localhost:" + port + "/api/store/checkout",
                HttpMethod.POST,
                new HttpEntity<>(body, headers),
                Map.class
        );

        assertThat(response.getStatusCode().value()).isEqualTo(409);
        Map<String, Object> error = (Map<String, Object>) response.getBody().get("error");
        assertThat(error.get("code")).isEqualTo("coupon_expired");
    }

    @Test
    void checkoutRejectsCouponWhenUsageLimitReached() {
        String slug = "limited-coupon-store-" + UUID.randomUUID();
        Store store = storeRepository.save(new Store(UUID.randomUUID(), slug, "Limited Coupon Store"));
        Product product = productRepository.save(new Product(UUID.randomUUID(), store.getId(), "SKU-LIMIT", "Promo", 1000));
        StorePromotion promotion = storePromotionRepository.save(new StorePromotion(
                UUID.randomUUID(),
                store.getId(),
                "LIMITADO",
                StorePromotionType.FIXED,
                new java.math.BigDecimal("3.00"),
                true,
                null,
                1L
        ));
        promotion.incrementUsage();
        storePromotionRepository.save(promotion);

        Map<String, Object> body = Map.of(
                "items", List.of(Map.of("productId", product.getId().toString(), "qty", 1)),
                "couponCode", "LIMITADO"
        );

        HttpHeaders headers = new HttpHeaders();
        headers.set("Host", slug + ".example.com");
        headers.set("X-Forwarded-Host", slug + ".example.com");

        ResponseEntity<Map> response = restTemplate.exchange(
                "http://localhost:" + port + "/api/store/checkout",
                HttpMethod.POST,
                new HttpEntity<>(body, headers),
                Map.class
        );

        assertThat(response.getStatusCode().value()).isEqualTo(409);
        Map<String, Object> error = (Map<String, Object>) response.getBody().get("error");
        assertThat(error.get("code")).isEqualTo("coupon_usage_limit_reached");
    }
}
