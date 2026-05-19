package com.barmi.orders;

import com.barmi.PostgresIntegrationTestBase;
import com.barmi.testsupport.ApiTestClient;
import com.barmi.domain.catalog.Product;
import com.barmi.domain.catalog.StorePromotion;
import com.barmi.domain.catalog.StorePromotionType;
import com.barmi.domain.store.Store;
import com.barmi.infra.repo.OutboxEventRepository;
import com.barmi.infra.repo.ProductRepository;
import com.barmi.infra.repo.StoreOrderRepository;
import com.barmi.infra.repo.StorePromotionRepository;
import com.barmi.infra.repo.StoreRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.TestConstructor;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.time.Instant;
import java.math.BigDecimal;


import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "jwt.secret=this_is_a_super_long_test_secret_key_that_is_at_least_32_bytes_long",
        "app.money.defaultCurrency=ARS"
})
@AutoConfigureMockMvc
@TestConstructor(autowireMode = TestConstructor.AutowireMode.ALL)
class StoreCheckoutControllerIT extends PostgresIntegrationTestBase {

    private final StoreRepository storeRepository;
    private final ProductRepository productRepository;
    private final StoreOrderRepository storeOrderRepository;
    private final OutboxEventRepository outboxEventRepository;
    private final StorePromotionRepository storePromotionRepository;
    private final JdbcTemplate jdbcTemplate;
    private final ApiTestClient api;

@Autowired
    StoreCheckoutControllerIT(
            StoreRepository storeRepository,
            ProductRepository productRepository,
            StoreOrderRepository storeOrderRepository,
            OutboxEventRepository outboxEventRepository,
            StorePromotionRepository storePromotionRepository,
            JdbcTemplate jdbcTemplate,
            MockMvc mockMvc
    ) {
        this.storeRepository = storeRepository;
        this.productRepository = productRepository;
        this.storeOrderRepository = storeOrderRepository;
        this.outboxEventRepository = outboxEventRepository;
        this.storePromotionRepository = storePromotionRepository;
        this.jdbcTemplate = jdbcTemplate;
        this.api = new ApiTestClient(mockMvc);
    }

    @BeforeEach
    void setup() {
        truncateAllTables(jdbcTemplate);
    }

    @Test
    void checkoutCreatesOrderAndOutbox() throws Exception {
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

        var response = api.postJson("/api/store/checkout", body, api.storeHostHeaders("cafe"));

        assertThat(response.status()).isEqualTo(201);
        assertThat(response.body()).containsKeys("orderId", "subtotalAmount", "totalAmount");
        assertThat(response.body().get("currency")).isEqualTo("ARS");
        assertThat(response.body().get("shippingCostAmount").toString()).isEqualTo("0");

        String orderId = response.body().get("orderId").toString();
        assertThat(storeOrderRepository.findById(UUID.fromString(orderId))).isPresent();
        assertThat(storeOrderRepository.findById(UUID.fromString(orderId)).orElseThrow().getBuyerEmail()).isEqualTo("guest@example.com");
        assertThat(outboxEventRepository.findByAggregateIdAndEventType(UUID.fromString(orderId), "STORE_ORDER_CREATED"))
                .hasSize(1);
    }

    @Test
    void checkoutWithMissingProductReturnsNotFound() throws Exception {
        Store store = storeRepository.save(new Store(UUID.randomUUID(), "cafe2", "Cafe2"));
        productRepository.save(new Product(UUID.randomUUID(), store.getId(), "SKU9", "Cortado", 400));

        Map<String, Object> body = Map.of(
                "buyerEmail", "missing@example.com",
                "items", List.of(
                        Map.of("productId", UUID.randomUUID().toString(), "qty", 1)
                )
        );

        var response = api.postJson("/api/store/checkout", body, api.storeHostHeaders("cafe2"));

        assertThat(response.status()).isEqualTo(404);
        assertThat(response.body()).containsKey("error");
        Map<String, Object> error = (Map<String, Object>) response.body().get("error");
        assertThat(error.get("code")).isEqualTo("product_not_found");
        assertThat(error.get("status")).isEqualTo(404);
    }

    @Test
    void checkoutRejectsQuantityAboveStock() throws Exception {
        Store store = storeRepository.save(new Store(UUID.randomUUID(), "cafe3", "Cafe3"));
        Product p1 = productRepository.save(new Product(UUID.randomUUID(), store.getId(), "SKU-STOCK", "Latte", 500, 2));

        Map<String, Object> body = Map.of(
                "buyerEmail", "stock@example.com",
                "items", List.of(
                        Map.of("productId", p1.getId().toString(), "qty", 3)
                )
        );

        var response = api.postJson("/api/store/checkout", body, api.storeHostHeaders("cafe3"));

        assertThat(response.status()).isEqualTo(409);
        assertThat(response.body()).containsKey("error");
        Map<String, Object> error = (Map<String, Object>) response.body().get("error");
        assertThat(error.get("code")).isEqualTo("product_out_of_stock");
        assertThat(error.get("status")).isEqualTo(409);
    }

    @Test
    void checkoutAppliesCouponAndPersistsDiscountAmounts() throws Exception {
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

        var response = api.postJson("/api/store/checkout", body, api.storeHostHeaders(slug));

        assertThat(response.status()).isEqualTo(201);
        assertThat(new BigDecimal(response.body().get("subtotalAmount").toString())).isEqualByComparingTo("20.00");
        assertThat(new BigDecimal(response.body().get("originalAmount").toString())).isEqualByComparingTo("20.00");
        assertThat(new BigDecimal(response.body().get("discountAmount").toString())).isEqualByComparingTo("2.00");
        assertThat(new BigDecimal(response.body().get("totalAmount").toString())).isEqualByComparingTo("18.00");
        assertThat(response.body().get("appliedCouponCode")).isEqualTo("BIENVENIDA10");

        UUID orderId = UUID.fromString(response.body().get("orderId").toString());
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
    void checkoutRejectsExpiredCoupon() throws Exception {
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
                "buyerEmail", "expired@example.com",
                "items", List.of(Map.of("productId", product.getId().toString(), "qty", 1)),
                "couponCode", "VENCIDO"
        );

        var response = api.postJson("/api/store/checkout", body, api.storeHostHeaders(slug));

        assertThat(response.status()).isEqualTo(409);
        Map<String, Object> error = (Map<String, Object>) response.body().get("error");
        assertThat(error.get("code")).isEqualTo("coupon_expired");
    }

    @Test
    void checkoutRejectsCouponWhenUsageLimitReached() throws Exception {
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
                "buyerEmail", "limit@example.com",
                "items", List.of(Map.of("productId", product.getId().toString(), "qty", 1)),
                "couponCode", "LIMITADO"
        );

        var response = api.postJson("/api/store/checkout", body, api.storeHostHeaders(slug));

        assertThat(response.status()).isEqualTo(409);
        Map<String, Object> error = (Map<String, Object>) response.body().get("error");
        assertThat(error.get("code")).isEqualTo("coupon_usage_limit_reached");
    }
}
