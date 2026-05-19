package com.barmi.payments;

import com.barmi.app.orders.CheckoutStoreOrderService;
import com.barmi.app.orders.CheckoutStoreOrderService.CheckoutItem;
import com.barmi.domain.catalog.Product;
import com.barmi.domain.catalog.StorePromotion;
import com.barmi.domain.catalog.StorePromotionType;
import com.barmi.domain.enums.PaymentScope;
import com.barmi.domain.orders.StoreOrder;
import com.barmi.domain.orders.StoreOrderStatus;
import com.barmi.domain.store.Store;
import com.barmi.infra.repo.OutboxEventRepository;
import com.barmi.infra.repo.PaymentRepository;
import com.barmi.infra.repo.ProcessedEventRepository;
import com.barmi.infra.repo.ProductRepository;
import com.barmi.infra.repo.StoreFulfillmentRepository;
import com.barmi.infra.repo.StoreOrderRepository;
import com.barmi.infra.repo.StorePromotionRepository;
import com.barmi.infra.repo.StoreRepository;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.context.SpringBootTest;
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

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;


import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase.Replace.NONE;

@Testcontainers
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "jwt.secret=this_is_a_super_long_test_secret_key_that_is_at_least_32_bytes_long",
        "app.money.defaultCurrency=ARS",
        "app.mercadoPago.webhookSecret=secret",
        "app.security.allowDevIdentityHeader=true"
})
@TestConstructor(autowireMode = TestConstructor.AutowireMode.ALL)
@ActiveProfiles("integrationtest")
@AutoConfigureTestDatabase(replace = NONE)
class MercadoPagoWebhookStorePaymentIT {

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

    private final CheckoutStoreOrderService checkoutService;
    private final StoreRepository storeRepository;
    private final ProductRepository productRepository;
    private final StoreOrderRepository storeOrderRepository;
    private final PaymentRepository paymentRepository;
    private final ProcessedEventRepository processedEventRepository;
    private final OutboxEventRepository outboxEventRepository;
    private final StoreFulfillmentRepository storeFulfillmentRepository;
    private final StorePromotionRepository storePromotionRepository;
    private final org.springframework.boot.test.web.client.TestRestTemplate restTemplate;

    @org.springframework.boot.test.web.server.LocalServerPort
    private int port;

@Autowired
    MercadoPagoWebhookStorePaymentIT(
            CheckoutStoreOrderService checkoutService,
            StoreRepository storeRepository,
            ProductRepository productRepository,
            StoreOrderRepository storeOrderRepository,
            PaymentRepository paymentRepository,
            ProcessedEventRepository processedEventRepository,
            OutboxEventRepository outboxEventRepository,
            StoreFulfillmentRepository storeFulfillmentRepository,
            StorePromotionRepository storePromotionRepository,
            org.springframework.boot.test.web.client.TestRestTemplate restTemplate
    ) {
        this.checkoutService = checkoutService;
        this.storeRepository = storeRepository;
        this.productRepository = productRepository;
        this.storeOrderRepository = storeOrderRepository;
        this.paymentRepository = paymentRepository;
        this.processedEventRepository = processedEventRepository;
        this.outboxEventRepository = outboxEventRepository;
        this.storeFulfillmentRepository = storeFulfillmentRepository;
        this.storePromotionRepository = storePromotionRepository;
        this.restTemplate = restTemplate;
    }

    @Test
    void webhookConfirmsPaymentAndIsIdempotent() {
        Store store = storeRepository.save(new Store(UUID.randomUUID(), "cafe", "Cafe"));
        Product p1 = productRepository.save(new Product(UUID.randomUUID(), store.getId(), "SKU1", "Latte", 500, 5));

        com.barmi.app.tenant.TenantContext.setStoreSlug("cafe");
        StoreOrder order;
        try {
            order = checkoutService.checkout(List.of(new CheckoutItem(p1.getId(), 1)), null, null, "webhook@example.com");
        } finally {
            com.barmi.app.tenant.TenantContext.clear();
        }
        assertThat(order.getStatus()).isEqualTo(StoreOrderStatus.PENDING_PAYMENT);

        UUID eventId = UUID.randomUUID();
        String providerPaymentId = "mp_123";

        Map<String, Object> payload = Map.of(
                "event_id", eventId.toString(),
                "scope", PaymentScope.STORE.name(),
                "operation_id", order.getId().toString(),
                "provider_payment_id", providerPaymentId,
                "status", "approved",
                "amount", new BigDecimal("5.00"),
                "currency", "ARS"
        );

        HttpHeaders headers = new HttpHeaders();
        headers.set("X-Barmi-Webhook-Secret", "secret");
        HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);

        ResponseEntity<Map> response = restTemplate.exchange(
                "http://localhost:" + port + "/api/webhooks/mercadopago",
                HttpMethod.POST,
                request,
                Map.class
        );
        assertThat(response.getStatusCode().value()).isEqualTo(200);

        StoreOrder updated = storeOrderRepository.findById(order.getId()).orElseThrow();
        assertThat(updated.getStatus()).isEqualTo(StoreOrderStatus.PAID);
        assertThat(productRepository.findById(p1.getId()).orElseThrow().getStockQuantity()).isEqualTo(4);

        assertThat(paymentRepository.findByProviderAndProviderPaymentId("MERCADOPAGO", providerPaymentId))
                .isPresent();
        assertThat(paymentRepository.findByProviderAndProviderPaymentId("MERCADOPAGO", providerPaymentId).orElseThrow().getStatus())
                .isEqualTo(com.barmi.domain.payments.PaymentStatus.CONFIRMED);

        assertThat(outboxEventRepository.findByAggregateIdAndEventType(order.getId(), "STORE_ORDER_PAID"))
                .hasSize(1);

        var fulfillment = storeFulfillmentRepository.findByStoreOrderId(order.getId()).orElseThrow();
        assertThat(outboxEventRepository.findByAggregateIdAndEventType(fulfillment.getId(), "STORE_FULFILLMENT_CREATED"))
                .hasSize(1);

        long processedCount = processedEventRepository.count();
        long paymentCount = paymentRepository.count();
        long fulfillmentCount = storeFulfillmentRepository.count();
        long fulfillmentEventCount = outboxEventRepository.findByAggregateIdAndEventType(fulfillment.getId(), "STORE_FULFILLMENT_CREATED").size();
        long stockAfterFirstConfirmation = productRepository.findById(p1.getId()).orElseThrow().getStockQuantity();

        Map<String, Object> duplicatePayload = Map.of(
                "event_id", UUID.randomUUID().toString(),
                "scope", PaymentScope.STORE.name(),
                "operation_id", order.getId().toString(),
                "provider_payment_id", providerPaymentId,
                "status", "approved",
                "amount", new BigDecimal("5.00"),
                "currency", "ARS"
        );
        HttpEntity<Map<String, Object>> duplicateRequest = new HttpEntity<>(duplicatePayload, headers);
        ResponseEntity<Map> dupResponse = restTemplate.exchange(
                "http://localhost:" + port + "/api/webhooks/mercadopago",
                HttpMethod.POST,
                duplicateRequest,
                Map.class
        );
        assertThat(dupResponse.getStatusCode().value()).isEqualTo(200);

        long processedCountAfter = processedEventRepository.count();
        assertThat(processedCountAfter).isEqualTo(processedCount + 1);
        assertThat(paymentRepository.count()).isEqualTo(paymentCount);
        assertThat(storeFulfillmentRepository.count()).isEqualTo(fulfillmentCount);
        assertThat(productRepository.findById(p1.getId()).orElseThrow().getStockQuantity()).isEqualTo(stockAfterFirstConfirmation);
        assertThat(outboxEventRepository.findByAggregateIdAndEventType(fulfillment.getId(), "STORE_FULFILLMENT_CREATED").size())
                .isEqualTo(fulfillmentEventCount);
        assertThat(outboxEventRepository.findByAggregateIdAndEventType(order.getId(), "STORE_ORDER_PAID"))
                .hasSize(1);
    }

    @Test
    void couponUsageIsConsumedOnPaymentConfirmationAndNotOnCheckout() {
        Store store = storeRepository.save(new Store(UUID.randomUUID(), "cafe-promo", "Cafe Promo"));
        Product p1 = productRepository.save(new Product(UUID.randomUUID(), store.getId(), "SKU-PROMO", "Latte", 500, 5));
        StorePromotion promotion = storePromotionRepository.save(new StorePromotion(
                UUID.randomUUID(),
                store.getId(),
                "PROMO10",
                StorePromotionType.PERCENTAGE,
                new BigDecimal("10.00"),
                true,
                null,
                5L
        ));

        com.barmi.app.tenant.TenantContext.setStoreSlug("cafe-promo");
        StoreOrder order;
        try {
            order = checkoutService.checkout(List.of(new CheckoutItem(p1.getId(), 2)), null, "PROMO10", "coupon@example.com");
        } finally {
            com.barmi.app.tenant.TenantContext.clear();
        }

        assertThat(storePromotionRepository.findById(promotion.getId()).orElseThrow().getUsageCount()).isZero();
        assertThat(storeOrderRepository.findById(order.getId()).orElseThrow().getPromotionConsumedAt()).isNull();

        HttpHeaders headers = new HttpHeaders();
        headers.set("X-Barmi-Webhook-Secret", "secret");
        HttpEntity<Map<String, Object>> request = new HttpEntity<>(Map.of(
                "event_id", UUID.randomUUID().toString(),
                "scope", PaymentScope.STORE.name(),
                "operation_id", order.getId().toString(),
                "provider_payment_id", "mp_coupon_confirmed",
                "status", "approved",
                "amount", new BigDecimal("9.00"),
                "currency", "ARS"
        ), headers);

        ResponseEntity<Map> response = restTemplate.exchange(
                "http://localhost:" + port + "/api/webhooks/mercadopago",
                HttpMethod.POST,
                request,
                Map.class
        );
        assertThat(response.getStatusCode().value()).isEqualTo(200);

        assertThat(storePromotionRepository.findById(promotion.getId()).orElseThrow().getUsageCount()).isEqualTo(1);
        assertThat(storeOrderRepository.findById(order.getId()).orElseThrow().getPromotionConsumedAt()).isNotNull();
    }

    @Test
    void duplicateWebhookDoesNotConsumeCouponTwice() {
        Store store = storeRepository.save(new Store(UUID.randomUUID(), "cafe-promo-dup", "Cafe Promo Dup"));
        Product p1 = productRepository.save(new Product(UUID.randomUUID(), store.getId(), "SKU-PROMO-DUP", "Latte", 500, 5));
        StorePromotion promotion = storePromotionRepository.save(new StorePromotion(
                UUID.randomUUID(),
                store.getId(),
                "PROMODUP",
                StorePromotionType.FIXED,
                new BigDecimal("1.00"),
                true,
                null,
                5L
        ));

        com.barmi.app.tenant.TenantContext.setStoreSlug("cafe-promo-dup");
        StoreOrder order;
        try {
            order = checkoutService.checkout(List.of(new CheckoutItem(p1.getId(), 1)), null, "PROMODUP", "coupon-dup@example.com");
        } finally {
            com.barmi.app.tenant.TenantContext.clear();
        }

        HttpHeaders headers = new HttpHeaders();
        headers.set("X-Barmi-Webhook-Secret", "secret");

        restTemplate.exchange(
                "http://localhost:" + port + "/api/webhooks/mercadopago",
                HttpMethod.POST,
                new HttpEntity<>(Map.of(
                        "event_id", UUID.randomUUID().toString(),
                        "scope", PaymentScope.STORE.name(),
                        "operation_id", order.getId().toString(),
                        "provider_payment_id", "mp_coupon_dup",
                        "status", "approved",
                        "amount", new BigDecimal("4.00"),
                        "currency", "ARS"
                ), headers),
                Map.class
        );

        restTemplate.exchange(
                "http://localhost:" + port + "/api/webhooks/mercadopago",
                HttpMethod.POST,
                new HttpEntity<>(Map.of(
                        "event_id", UUID.randomUUID().toString(),
                        "scope", PaymentScope.STORE.name(),
                        "operation_id", order.getId().toString(),
                        "provider_payment_id", "mp_coupon_dup",
                        "status", "approved",
                        "amount", new BigDecimal("4.00"),
                        "currency", "ARS"
                ), headers),
                Map.class
        );

        assertThat(storePromotionRepository.findById(promotion.getId()).orElseThrow().getUsageCount()).isEqualTo(1);
        assertThat(storeOrderRepository.findById(order.getId()).orElseThrow().getPromotionConsumedAt()).isNotNull();
    }

    @Test
    void webhookWithAmountMismatchDoesNotMarkPaidAndEmitsMismatchEvent() {
        Store store = storeRepository.save(new Store(UUID.randomUUID(), "cafe2", "Cafe2"));
        Product p1 = productRepository.save(new Product(UUID.randomUUID(), store.getId(), "SKU2", "Mocha", 700));

        com.barmi.app.tenant.TenantContext.setStoreSlug("cafe2");
        StoreOrder order;
        try {
            order = checkoutService.checkout(List.of(new CheckoutItem(p1.getId(), 1)), null, null, "mismatch@example.com");
        } finally {
            com.barmi.app.tenant.TenantContext.clear();
        }

        UUID eventId = UUID.randomUUID();
        String providerPaymentId = "mp_999";

        Map<String, Object> payload = Map.of(
                "event_id", eventId.toString(),
                "scope", PaymentScope.STORE.name(),
                "operation_id", order.getId().toString(),
                "provider_payment_id", providerPaymentId,
                "status", "approved",
                "amount", new BigDecimal("8.00"),
                "currency", "ARS"
        );

        HttpHeaders headers = new HttpHeaders();
        headers.set("X-Barmi-Webhook-Secret", "secret");
        HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);

        ResponseEntity<Map> response = restTemplate.exchange(
                "http://localhost:" + port + "/api/webhooks/mercadopago",
                HttpMethod.POST,
                request,
                Map.class
        );
        assertThat(response.getStatusCode().value()).isEqualTo(200);

        StoreOrder updated = storeOrderRepository.findById(order.getId()).orElseThrow();
        assertThat(updated.getStatus()).isEqualTo(StoreOrderStatus.PENDING_PAYMENT);

        assertThat(paymentRepository.findByProviderAndProviderPaymentId("MERCADOPAGO", providerPaymentId))
                .isPresent();
        assertThat(paymentRepository.findByProviderAndProviderPaymentId("MERCADOPAGO", providerPaymentId).orElseThrow().getStatus())
                .isEqualTo(com.barmi.domain.payments.PaymentStatus.CONFIRMED);

        assertThat(outboxEventRepository.findByAggregateIdAndEventType(order.getId(), "STORE_ORDER_PAYMENT_MISMATCH"))
                .hasSize(1);
    }

    @Test
    void webhookWithInsufficientStockDoesNotMarkPaidAndDoesNotGoNegative() {
        Store store = storeRepository.save(new Store(UUID.randomUUID(), "cafe3", "Cafe3"));
        Product p1 = productRepository.save(new Product(UUID.randomUUID(), store.getId(), "SKU3", "Flat White", 900, 1));

        com.barmi.app.tenant.TenantContext.setStoreSlug("cafe3");
        StoreOrder order;
        try {
            order = checkoutService.checkout(List.of(new CheckoutItem(p1.getId(), 1)), null, null, "stock-conflict@example.com");
        } finally {
            com.barmi.app.tenant.TenantContext.clear();
        }

        p1.updateStockQuantity(0);
        productRepository.save(p1);

        Map<String, Object> payload = Map.of(
                "event_id", UUID.randomUUID().toString(),
                "scope", PaymentScope.STORE.name(),
                "operation_id", order.getId().toString(),
                "provider_payment_id", "mp_stock_conflict",
                "status", "approved",
                "amount", new BigDecimal("9.00"),
                "currency", "ARS"
        );

        HttpHeaders headers = new HttpHeaders();
        headers.set("X-Barmi-Webhook-Secret", "secret");
        HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);

        ResponseEntity<Map> response = restTemplate.exchange(
                "http://localhost:" + port + "/api/webhooks/mercadopago",
                HttpMethod.POST,
                request,
                Map.class
        );
        assertThat(response.getStatusCode().value()).isEqualTo(200);

        StoreOrder updated = storeOrderRepository.findById(order.getId()).orElseThrow();
        assertThat(updated.getStatus()).isEqualTo(StoreOrderStatus.PENDING_PAYMENT);
        assertThat(paymentRepository.findByProviderAndProviderPaymentId("MERCADOPAGO", "mp_stock_conflict"))
                .isPresent();
        assertThat(productRepository.findById(p1.getId()).orElseThrow().getStockQuantity()).isZero();
        assertThat(storeFulfillmentRepository.findByStoreOrderId(order.getId())).isEmpty();
        assertThat(outboxEventRepository.findByAggregateIdAndEventType(order.getId(), "STORE_ORDER_STOCK_CONFLICT"))
                .hasSize(1);
        assertThat(outboxEventRepository.findByAggregateIdAndEventType(order.getId(), "STORE_ORDER_PAID"))
                .isEmpty();
    }
}
