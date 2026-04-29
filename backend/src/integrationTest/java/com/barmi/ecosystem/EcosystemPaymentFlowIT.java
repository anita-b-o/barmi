package com.barmi.ecosystem;

import com.barmi.app.ecosystem.EcosystemFulfillmentService;
import com.barmi.domain.ecosystem.Ecosystem;
import com.barmi.domain.ecosystem.EcosystemExternalProduct;
import com.barmi.domain.ecosystem.EcosystemPromotion;
import com.barmi.domain.ecosystem.EcosystemPromotionType;
import com.barmi.domain.orders.EcosystemOrder;
import com.barmi.domain.orders.EcosystemOrderStatus;
import com.barmi.infra.repo.EcosystemExternalProductRepository;
import com.barmi.infra.repo.EcosystemFulfillmentRepository;
import com.barmi.infra.repo.EcosystemOrderRepository;
import com.barmi.infra.repo.EcosystemPromotionRepository;
import com.barmi.infra.repo.EcosystemRepository;
import com.barmi.infra.repo.OutboxEventRepository;
import com.barmi.infra.repo.PaymentRepository;
import com.barmi.infra.repo.ProcessedEventRepository;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.TestConstructor;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.beans.factory.annotation.Autowired;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import com.barmi.testsupport.ApiTestClient;

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
@org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
@TestConstructor(autowireMode = TestConstructor.AutowireMode.ALL)
@ActiveProfiles("integrationtest")
@AutoConfigureTestDatabase(replace = NONE)
class EcosystemPaymentFlowIT {

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

    private final EcosystemRepository ecosystemRepository;
    private final EcosystemExternalProductRepository ecosystemExternalProductRepository;
    private final EcosystemOrderRepository ecosystemOrderRepository;
    private final EcosystemPromotionRepository ecosystemPromotionRepository;
    private final PaymentRepository paymentRepository;
    private final ProcessedEventRepository processedEventRepository;
    private final OutboxEventRepository outboxEventRepository;
    private final EcosystemFulfillmentRepository ecosystemFulfillmentRepository;
    private final EcosystemFulfillmentService ecosystemFulfillmentService;
    private final ApiTestClient api;

    @Autowired
    EcosystemPaymentFlowIT(
            EcosystemRepository ecosystemRepository,
            EcosystemExternalProductRepository ecosystemExternalProductRepository,
            EcosystemOrderRepository ecosystemOrderRepository,
            EcosystemPromotionRepository ecosystemPromotionRepository,
            PaymentRepository paymentRepository,
            ProcessedEventRepository processedEventRepository,
            OutboxEventRepository outboxEventRepository,
            EcosystemFulfillmentRepository ecosystemFulfillmentRepository,
            EcosystemFulfillmentService ecosystemFulfillmentService,
            MockMvc mockMvc
    ) {
        this.ecosystemRepository = ecosystemRepository;
        this.ecosystemExternalProductRepository = ecosystemExternalProductRepository;
        this.ecosystemOrderRepository = ecosystemOrderRepository;
        this.ecosystemPromotionRepository = ecosystemPromotionRepository;
        this.paymentRepository = paymentRepository;
        this.processedEventRepository = processedEventRepository;
        this.outboxEventRepository = outboxEventRepository;
        this.ecosystemFulfillmentRepository = ecosystemFulfillmentRepository;
        this.ecosystemFulfillmentService = ecosystemFulfillmentService;
        this.api = new ApiTestClient(mockMvc);
    }

    @Test
    void happyPathCheckoutWebhookPaidCreatesFulfillment() throws Exception {
        Ecosystem ecosystem = ecosystemRepository.save(new Ecosystem(UUID.randomUUID(), "Eco", "eco"));
        EcosystemExternalProduct product = ecosystemExternalProductRepository.save(
                new EcosystemExternalProduct(UUID.randomUUID(), ecosystem, "Coffee", new BigDecimal("10.00"), "ARS", true)
        );

        Map<String, Object> checkoutPayload = Map.of(
                "ecosystemId", ecosystem.getId().toString(),
                "items", List.of(Map.of(
                        "externalProductId", product.getId().toString(),
                        "qty", 2
                ))
        );

        ApiTestClient.ApiTestResponse checkoutResponse = api.postJson(
                "/api/ecosystem/checkout",
                checkoutPayload,
                null
        );
        assertThat(checkoutResponse.status()).isEqualTo(201);
        UUID orderId = UUID.fromString(checkoutResponse.body().get("id").toString());
        BigDecimal totalAmount = new BigDecimal(checkoutResponse.body().get("totalAmount").toString());

        UUID eventId = UUID.randomUUID();
        String providerPaymentId = "mp_ecosystem_1";
        Map<String, Object> webhookPayload = Map.of(
                "eventId", eventId.toString(),
                "ecosystemOrderId", orderId.toString(),
                "providerPaymentId", providerPaymentId,
                "amount", totalAmount,
                "currency", "ARS"
        );

        HttpHeaders headers = api.withWebhookSecret(new HttpHeaders(), "secret");
        ApiTestClient.ApiTestResponse response = api.postJson(
                "/api/payments/mercadopago/ecosystem/webhook",
                webhookPayload,
                headers
        );
        assertThat(response.status()).isEqualTo(200);

        EcosystemOrder updated = ecosystemOrderRepository.findById(orderId).orElseThrow();
        assertThat(updated.getStatus()).isEqualTo(EcosystemOrderStatus.PAID);

        assertThat(paymentRepository.findByProviderAndProviderPaymentId("MERCADOPAGO", providerPaymentId))
                .isPresent();
        assertThat(outboxEventRepository.findByAggregateIdAndEventType(orderId, "ECOSYSTEM_ORDER_PAID"))
                .hasSize(1);

        ecosystemFulfillmentService.createForPaidOrder(orderId);
        var fulfillment = ecosystemFulfillmentRepository.findByEcosystemOrderId(orderId).orElseThrow();
        assertThat(outboxEventRepository.findByAggregateIdAndEventType(fulfillment.getId(), "ECOSYSTEM_FULFILLMENT_CREATED"))
                .hasSize(1);
    }

    @Test
    void idempotencySameProviderPaymentIdDoesNotDuplicateOutboxOrFulfillment() throws Exception {
        Ecosystem ecosystem = ecosystemRepository.save(new Ecosystem(UUID.randomUUID(), "Eco2", "eco2"));
        EcosystemExternalProduct product = ecosystemExternalProductRepository.save(
                new EcosystemExternalProduct(UUID.randomUUID(), ecosystem, "Tea", new BigDecimal("5.00"), "ARS", true)
        );

        Map<String, Object> checkoutPayload = Map.of(
                "ecosystemId", ecosystem.getId().toString(),
                "items", List.of(Map.of(
                        "externalProductId", product.getId().toString(),
                        "qty", 1
                ))
        );

        ApiTestClient.ApiTestResponse checkoutResponse = api.postJson(
                "/api/ecosystem/checkout",
                checkoutPayload,
                null
        );
        UUID orderId = UUID.fromString(checkoutResponse.body().get("id").toString());
        BigDecimal totalAmount = new BigDecimal(checkoutResponse.body().get("totalAmount").toString());

        String providerPaymentId = "mp_ecosystem_2";

        HttpHeaders headers = api.withWebhookSecret(new HttpHeaders(), "secret");

        Map<String, Object> webhookPayload1 = Map.of(
                "eventId", UUID.randomUUID().toString(),
                "ecosystemOrderId", orderId.toString(),
                "providerPaymentId", providerPaymentId,
                "amount", totalAmount,
                "currency", "ARS"
        );
        api.postJson(
                "/api/payments/mercadopago/ecosystem/webhook",
                webhookPayload1,
                headers
        );

        ecosystemFulfillmentService.createForPaidOrder(orderId);

        long paidEvents = outboxEventRepository.findByAggregateIdAndEventType(orderId, "ECOSYSTEM_ORDER_PAID").size();
        long fulfillmentCount = ecosystemFulfillmentRepository.count();

        Map<String, Object> webhookPayload2 = Map.of(
                "eventId", UUID.randomUUID().toString(),
                "ecosystemOrderId", orderId.toString(),
                "providerPaymentId", providerPaymentId,
                "amount", totalAmount,
                "currency", "ARS"
        );
        api.postJson(
                "/api/payments/mercadopago/ecosystem/webhook",
                webhookPayload2,
                headers
        );

        assertThat(outboxEventRepository.findByAggregateIdAndEventType(orderId, "ECOSYSTEM_ORDER_PAID").size())
                .isEqualTo(paidEvents);
        assertThat(ecosystemFulfillmentRepository.count()).isEqualTo(fulfillmentCount);
        assertThat(paymentRepository.findByProviderAndProviderPaymentId("MERCADOPAGO", providerPaymentId))
                .isPresent();
    }

    @Test
    void mismatchEmitsMismatchAndNoFulfillment() throws Exception {
        Ecosystem ecosystem = ecosystemRepository.save(new Ecosystem(UUID.randomUUID(), "Eco3", "eco3"));
        EcosystemExternalProduct product = ecosystemExternalProductRepository.save(
                new EcosystemExternalProduct(UUID.randomUUID(), ecosystem, "Cake", new BigDecimal("12.00"), "ARS", true)
        );

        Map<String, Object> checkoutPayload = Map.of(
                "ecosystemId", ecosystem.getId().toString(),
                "items", List.of(Map.of(
                        "externalProductId", product.getId().toString(),
                        "qty", 1
                ))
        );

        ApiTestClient.ApiTestResponse checkoutResponse = api.postJson(
                "/api/ecosystem/checkout",
                checkoutPayload,
                null
        );
        UUID orderId = UUID.fromString(checkoutResponse.body().get("id").toString());

        Map<String, Object> webhookPayload = Map.of(
                "eventId", UUID.randomUUID().toString(),
                "ecosystemOrderId", orderId.toString(),
                "providerPaymentId", "mp_ecosystem_mismatch",
                "amount", new BigDecimal("13.00"),
                "currency", "ARS"
        );

        HttpHeaders headers = api.withWebhookSecret(new HttpHeaders(), "secret");
        api.postJson(
                "/api/payments/mercadopago/ecosystem/webhook",
                webhookPayload,
                headers
        );

        EcosystemOrder updated = ecosystemOrderRepository.findById(orderId).orElseThrow();
        assertThat(updated.getStatus()).isEqualTo(EcosystemOrderStatus.PENDING_PAYMENT);
        assertThat(outboxEventRepository.findByAggregateIdAndEventType(orderId, "ECOSYSTEM_ORDER_PAYMENT_MISMATCH"))
                .hasSize(1);
        assertThat(ecosystemFulfillmentRepository.findByEcosystemOrderId(orderId)).isEmpty();
    }

    @Test
    void invalidSecretReturns401AndNoSideEffects() throws Exception {
        Ecosystem ecosystem = ecosystemRepository.save(new Ecosystem(UUID.randomUUID(), "Eco4", "eco4"));
        EcosystemExternalProduct product = ecosystemExternalProductRepository.save(
                new EcosystemExternalProduct(UUID.randomUUID(), ecosystem, "Juice", new BigDecimal("3.00"), "ARS", true)
        );

        Map<String, Object> checkoutPayload = Map.of(
                "ecosystemId", ecosystem.getId().toString(),
                "items", List.of(Map.of(
                        "externalProductId", product.getId().toString(),
                        "qty", 1
                ))
        );

        ApiTestClient.ApiTestResponse checkoutResponse = api.postJson(
                "/api/ecosystem/checkout",
                checkoutPayload,
                null
        );
        UUID orderId = UUID.fromString(checkoutResponse.body().get("id").toString());

        String providerPaymentId = "mp_ecosystem_invalid_secret";
        Map<String, Object> webhookPayload = Map.of(
                "eventId", UUID.randomUUID().toString(),
                "ecosystemOrderId", orderId.toString(),
                "providerPaymentId", providerPaymentId,
                "amount", new BigDecimal("3.00"),
                "currency", "ARS"
        );
        HttpHeaders headers = api.withWebhookSecret(new HttpHeaders(), "wrong");
        ApiTestClient.ApiTestResponse response = api.postJson(
                "/api/payments/mercadopago/ecosystem/webhook",
                webhookPayload,
                headers
        );
        assertThat(response.status()).isEqualTo(401);

        EcosystemOrder updated = ecosystemOrderRepository.findById(orderId).orElseThrow();
        assertThat(updated.getStatus()).isEqualTo(EcosystemOrderStatus.PENDING_PAYMENT);
        assertThat(paymentRepository.findByProviderAndProviderPaymentId("MERCADOPAGO", providerPaymentId))
                .isEmpty();
        assertThat(outboxEventRepository.findByAggregateIdAndEventType(orderId, "ECOSYSTEM_ORDER_PAID"))
                .isEmpty();
    }

    @Test
    void checkoutWithCouponPersistsDiscountAndUsageIsConsumedOnlyOnPaymentConfirmation() throws Exception {
        Ecosystem ecosystem = ecosystemRepository.save(new Ecosystem(UUID.randomUUID(), "Eco Promo", "eco-promo"));
        EcosystemExternalProduct product = ecosystemExternalProductRepository.save(
                new EcosystemExternalProduct(UUID.randomUUID(), ecosystem, "Coffee", new BigDecimal("10.00"), "ARS", true)
        );
        EcosystemPromotion promotion = ecosystemPromotionRepository.save(new EcosystemPromotion(
                UUID.randomUUID(),
                ecosystem.getId(),
                "PROMO10",
                EcosystemPromotionType.PERCENTAGE,
                new BigDecimal("10.00"),
                true,
                null,
                5L
        ));

        ApiTestClient.ApiTestResponse previewResponse = api.postJson(
                "/api/ecosystem/checkout/preview",
                Map.of(
                        "ecosystemId", ecosystem.getId().toString(),
                        "items", List.of(Map.of("externalProductId", product.getId().toString(), "qty", 1)),
                        "couponCode", "promo10"
                ),
                null
        );
        assertThat(previewResponse.status()).isEqualTo(200);
        assertThat(new BigDecimal(previewResponse.body().get("discountAmount").toString()))
                .isEqualByComparingTo("1.00");
        assertThat(previewResponse.body().get("appliedCouponCode")).isEqualTo("PROMO10");

        ApiTestClient.ApiTestResponse checkoutResponse = api.postJson(
                "/api/ecosystem/checkout",
                Map.of(
                        "ecosystemId", ecosystem.getId().toString(),
                        "items", List.of(Map.of("externalProductId", product.getId().toString(), "qty", 1)),
                        "couponCode", "promo10"
                ),
                null
        );
        assertThat(checkoutResponse.status()).isEqualTo(201);
        UUID orderId = UUID.fromString(checkoutResponse.body().get("id").toString());

        EcosystemOrder createdOrder = ecosystemOrderRepository.findById(orderId).orElseThrow();
        assertThat(createdOrder.getOriginalAmount()).isEqualByComparingTo("10.00");
        assertThat(createdOrder.getDiscountAmount()).isEqualByComparingTo("1.00");
        assertThat(createdOrder.getTotalAmount()).isEqualByComparingTo("9.00");
        assertThat(createdOrder.getAppliedCouponCode()).isEqualTo("PROMO10");
        assertThat(createdOrder.getPromotionConsumedAt()).isNull();
        assertThat(ecosystemPromotionRepository.findById(promotion.getId()).orElseThrow().getUsageCount()).isZero();

        HttpHeaders headers = api.withWebhookSecret(new HttpHeaders(), "secret");
        ApiTestClient.ApiTestResponse webhookResponse = api.postJson(
                "/api/payments/mercadopago/ecosystem/webhook",
                Map.of(
                        "eventId", UUID.randomUUID().toString(),
                        "ecosystemOrderId", orderId.toString(),
                        "providerPaymentId", "mp_ecosystem_coupon_1",
                        "amount", new BigDecimal("9.00"),
                        "currency", "ARS"
                ),
                headers
        );
        assertThat(webhookResponse.status()).isEqualTo(200);

        assertThat(ecosystemPromotionRepository.findById(promotion.getId()).orElseThrow().getUsageCount()).isEqualTo(1);
        assertThat(ecosystemOrderRepository.findById(orderId).orElseThrow().getPromotionConsumedAt()).isNotNull();
    }

    @Test
    void duplicateWebhookDoesNotConsumeEcosystemCouponTwiceAndInvalidCouponsAreRejected() throws Exception {
        Ecosystem ecosystem = ecosystemRepository.save(new Ecosystem(UUID.randomUUID(), "Eco Promo Dup", "eco-promo-dup"));
        EcosystemExternalProduct product = ecosystemExternalProductRepository.save(
                new EcosystemExternalProduct(UUID.randomUUID(), ecosystem, "Tea", new BigDecimal("5.00"), "ARS", true)
        );
        EcosystemPromotion promotion = ecosystemPromotionRepository.save(new EcosystemPromotion(
                UUID.randomUUID(),
                ecosystem.getId(),
                "PROMODUP",
                EcosystemPromotionType.FIXED,
                new BigDecimal("1.00"),
                true,
                null,
                1L
        ));

        ApiTestClient.ApiTestResponse checkoutResponse = api.postJson(
                "/api/ecosystem/checkout",
                Map.of(
                        "ecosystemId", ecosystem.getId().toString(),
                        "items", List.of(Map.of("externalProductId", product.getId().toString(), "qty", 1)),
                        "couponCode", "PROMODUP"
                ),
                null
        );
        assertThat(checkoutResponse.status()).isEqualTo(201);
        UUID orderId = UUID.fromString(checkoutResponse.body().get("id").toString());

        HttpHeaders headers = api.withWebhookSecret(new HttpHeaders(), "secret");
        api.postJson(
                "/api/payments/mercadopago/ecosystem/webhook",
                Map.of(
                        "eventId", UUID.randomUUID().toString(),
                        "ecosystemOrderId", orderId.toString(),
                        "providerPaymentId", "mp_ecosystem_coupon_dup",
                        "amount", new BigDecimal("4.00"),
                        "currency", "ARS"
                ),
                headers
        );
        api.postJson(
                "/api/payments/mercadopago/ecosystem/webhook",
                Map.of(
                        "eventId", UUID.randomUUID().toString(),
                        "ecosystemOrderId", orderId.toString(),
                        "providerPaymentId", "mp_ecosystem_coupon_dup",
                        "amount", new BigDecimal("4.00"),
                        "currency", "ARS"
                ),
                headers
        );

        assertThat(ecosystemPromotionRepository.findById(promotion.getId()).orElseThrow().getUsageCount()).isEqualTo(1);

        ecosystemPromotionRepository.save(new EcosystemPromotion(
                UUID.randomUUID(),
                ecosystem.getId(),
                "VENCIDO",
                EcosystemPromotionType.FIXED,
                new BigDecimal("1.00"),
                true,
                java.time.Instant.parse("2026-03-01T00:00:00Z"),
                null
        ));

        ApiTestClient.ApiTestResponse expiredResponse = api.postJson(
                "/api/ecosystem/checkout/preview",
                Map.of(
                        "ecosystemId", ecosystem.getId().toString(),
                        "items", List.of(Map.of("externalProductId", product.getId().toString(), "qty", 1)),
                        "couponCode", "VENCIDO"
                ),
                null
        );
        assertThat(expiredResponse.status()).isEqualTo(409);

        EcosystemPromotion limitedPromotion = ecosystemPromotionRepository.save(new EcosystemPromotion(
                UUID.randomUUID(),
                ecosystem.getId(),
                "LIMITADO",
                EcosystemPromotionType.FIXED,
                new BigDecimal("1.00"),
                true,
                null,
                1L
        ));
        limitedPromotion.incrementUsage();
        ecosystemPromotionRepository.save(limitedPromotion);

        ApiTestClient.ApiTestResponse limitResponse = api.postJson(
                "/api/ecosystem/checkout/preview",
                Map.of(
                        "ecosystemId", ecosystem.getId().toString(),
                        "items", List.of(Map.of("externalProductId", product.getId().toString(), "qty", 1)),
                        "couponCode", "LIMITADO"
                ),
                null
        );
        assertThat(limitResponse.status()).isEqualTo(409);
    }
}
