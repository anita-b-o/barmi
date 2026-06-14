package com.barmi.orders;

import com.barmi.app.orders.CheckoutStoreOrderService;
import com.barmi.app.orders.CheckoutStoreOrderService.CheckoutItem;
import com.barmi.app.payments.StorePaymentConfirmationService;
import com.barmi.app.tenant.TenantContext;
import com.barmi.domain.catalog.Product;
import com.barmi.domain.enums.PaymentScope;
import com.barmi.domain.orders.StoreOrder;
import com.barmi.domain.orders.StoreOrderStatus;
import com.barmi.domain.payments.Payment;
import com.barmi.domain.payments.PaymentIntent;
import com.barmi.domain.payments.PaymentStatus;
import com.barmi.domain.fulfillment.StoreFulfillment;
import com.barmi.domain.fulfillment.FulfillmentStatus;
import com.barmi.domain.store.Store;
import com.barmi.domain.store.StoreMember;
import com.barmi.domain.store.StoreMemberRole;
import com.barmi.domain.store.StoreMemberStatus;
import com.barmi.domain.users.User;
import com.barmi.domain.users.UserStatus;
import com.barmi.infra.repo.OutboxEventRepository;
import com.barmi.infra.repo.PaymentIntentRepository;
import com.barmi.infra.repo.PaymentRepository;
import com.barmi.infra.repo.ProductRepository;
import com.barmi.infra.repo.StoreFulfillmentRepository;
import com.barmi.infra.repo.StoreMemberRepository;
import com.barmi.infra.repo.StoreOrderRepository;
import com.barmi.infra.repo.StoreRepository;
import com.barmi.infra.repo.UserRepository;
import com.barmi.testsupport.ApiTestClient;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.TestConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.Instant;
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
@AutoConfigureMockMvc
@TestConstructor(autowireMode = TestConstructor.AutowireMode.ALL)
@ActiveProfiles("integrationtest")
@AutoConfigureTestDatabase(replace = NONE)
class StoreOrderAdminIT {

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

    private final StoreRepository storeRepository;
    private final StoreMemberRepository storeMemberRepository;
    private final ProductRepository productRepository;
    private final StoreOrderRepository storeOrderRepository;
    private final PaymentRepository paymentRepository;
    private final PaymentIntentRepository paymentIntentRepository;
    private final OutboxEventRepository outboxEventRepository;
    private final StoreFulfillmentRepository storeFulfillmentRepository;
    private final UserRepository userRepository;
    private final CheckoutStoreOrderService checkoutStoreOrderService;
    private final StorePaymentConfirmationService storePaymentConfirmationService;
    private final PasswordEncoder passwordEncoder;
    private final JdbcTemplate jdbcTemplate;
    private final ApiTestClient api;

    @Autowired
    StoreOrderAdminIT(
            StoreRepository storeRepository,
            StoreMemberRepository storeMemberRepository,
            ProductRepository productRepository,
            StoreOrderRepository storeOrderRepository,
            PaymentRepository paymentRepository,
            PaymentIntentRepository paymentIntentRepository,
            OutboxEventRepository outboxEventRepository,
            StoreFulfillmentRepository storeFulfillmentRepository,
            UserRepository userRepository,
            CheckoutStoreOrderService checkoutStoreOrderService,
            StorePaymentConfirmationService storePaymentConfirmationService,
            PasswordEncoder passwordEncoder,
            JdbcTemplate jdbcTemplate,
            MockMvc mockMvc
    ) {
        this.storeRepository = storeRepository;
        this.storeMemberRepository = storeMemberRepository;
        this.productRepository = productRepository;
        this.storeOrderRepository = storeOrderRepository;
        this.paymentRepository = paymentRepository;
        this.paymentIntentRepository = paymentIntentRepository;
        this.outboxEventRepository = outboxEventRepository;
        this.storeFulfillmentRepository = storeFulfillmentRepository;
        this.userRepository = userRepository;
        this.checkoutStoreOrderService = checkoutStoreOrderService;
        this.storePaymentConfirmationService = storePaymentConfirmationService;
        this.passwordEncoder = passwordEncoder;
        this.jdbcTemplate = jdbcTemplate;
        this.api = new ApiTestClient(mockMvc);
    }

    @Test
    void manualCancellationCancelsOrderAndDoesNotDuplicateEvent() throws Exception {
        Store store = storeRepository.save(new Store(UUID.randomUUID(), "admin-cancel", "Admin Cancel"));
        String adminEmail = "admin-cancel@" + UUID.randomUUID() + ".test";
        createStoreUser(store, adminEmail, StoreMemberRole.ADMIN);
        Product product = productRepository.save(new Product(UUID.randomUUID(), store.getId(), "SKU-CANCEL", "Cancelable", 700, 2));

        StoreOrder order;
        try {
            TenantContext.setStoreSlug(store.getSlug());
            order = checkoutStoreOrderService.checkout(List.of(new CheckoutItem(product.getId(), 1)), null, null, "cancel@example.com");
        } finally {
            TenantContext.clear();
        }

        Payment payment = new Payment(
                UUID.randomUUID(),
                PaymentScope.STORE,
                order.getId(),
                "MERCADOPAGO",
                "mp_cancel_" + UUID.randomUUID(),
                PaymentStatus.PENDING,
                order.getTotalAmount(),
                order.getCurrency()
        );
        payment.markConfirmed();
        paymentRepository.save(payment);
        order.markPaid();
        storeOrderRepository.save(order);

        ApiTestClient.ApiTestResponse response = api.postJson(
                "/api/store/admin/orders/" + order.getId() + "/cancel",
                Map.of(),
                adminHeaders(store.getSlug(), adminEmail)
        );

        assertThat(response.status()).isEqualTo(200);
        assertThat(response.body().get("status")).isEqualTo("CANCELLED");
        assertThat(storeOrderRepository.findById(order.getId()).orElseThrow().getStatus()).isEqualTo(StoreOrderStatus.CANCELLED);
        assertThat(outboxEventRepository.findByAggregateIdAndEventType(order.getId(), "STORE_ORDER_MANUALLY_CANCELLED")).hasSize(1);

        List<Map<String, Object>> timeline = castList(response.body().get("timeline"));
        assertThat(timeline).extracting(item -> item.get("code"))
                .contains("PAYMENT_CONFIRMED", "MANUAL_CANCELLATION");

        ApiTestClient.ApiTestResponse secondResponse = api.postJson(
                "/api/store/admin/orders/" + order.getId() + "/cancel",
                Map.of(),
                adminHeaders(store.getSlug(), adminEmail)
        );

        assertThat(secondResponse.status()).isEqualTo(200);
        assertThat(outboxEventRepository.findByAggregateIdAndEventType(order.getId(), "STORE_ORDER_MANUALLY_CANCELLED")).hasSize(1);
    }

    @Test
    void retryProcessingResolvesStockConflictIdempotentlyAndExposesTimeline() throws Exception {
        Store store = storeRepository.save(new Store(UUID.randomUUID(), "admin-retry", "Admin Retry"));
        String adminEmail = "admin-retry@" + UUID.randomUUID() + ".test";
        createStoreUser(store, adminEmail, StoreMemberRole.ADMIN);
        Product product = productRepository.save(new Product(UUID.randomUUID(), store.getId(), "SKU-RETRY", "Retry Product", 500, 1));

        StoreOrder paidOrder;
        StoreOrder conflictedOrder;
        try {
            TenantContext.setStoreSlug(store.getSlug());
            paidOrder = checkoutStoreOrderService.checkout(List.of(new CheckoutItem(product.getId(), 1)), null, null, "paid@example.com");
            conflictedOrder = checkoutStoreOrderService.checkout(List.of(new CheckoutItem(product.getId(), 1)), null, null, "conflicted@example.com");
        } finally {
            TenantContext.clear();
        }

        paymentIntentRepository.save(new PaymentIntent(
                UUID.randomUUID(),
                PaymentScope.STORE,
                conflictedOrder.getId(),
                store.getId(),
                null,
                null,
                "MERCADOPAGO",
                PaymentStatus.PENDING,
                conflictedOrder.getTotalAmount(),
                conflictedOrder.getCurrency(),
                "pref_" + UUID.randomUUID(),
                "https://checkout.test/" + conflictedOrder.getId()
        ));

        storePaymentConfirmationService.confirmStorePayment(
                UUID.randomUUID(),
                paidOrder.getId(),
                "mp_paid_" + UUID.randomUUID(),
                paidOrder.getTotalAmount(),
                paidOrder.getCurrency()
        );
        storePaymentConfirmationService.confirmStorePayment(
                UUID.randomUUID(),
                conflictedOrder.getId(),
                "mp_conflict_" + UUID.randomUUID(),
                conflictedOrder.getTotalAmount(),
                conflictedOrder.getCurrency()
        );

        assertThat(storeOrderRepository.findById(conflictedOrder.getId()).orElseThrow().getStatus()).isEqualTo(StoreOrderStatus.PENDING_PAYMENT);
        assertThat(storeFulfillmentRepository.findByStoreOrderId(conflictedOrder.getId())).isEmpty();
        assertThat(outboxEventRepository.findByAggregateIdAndEventType(conflictedOrder.getId(), "STORE_ORDER_STOCK_CONFLICT")).hasSize(1);

        ApiTestClient.ApiTestResponse stillConflicted = api.postJson(
                "/api/store/admin/orders/" + conflictedOrder.getId() + "/retry-processing",
                Map.of(),
                adminHeaders(store.getSlug(), adminEmail)
        );

        assertThat(stillConflicted.status()).isEqualTo(200);
        assertThat(stillConflicted.body().get("resolved")).isEqualTo(false);
        assertThat(stillConflicted.body().get("stillConflicted")).isEqualTo(true);
        assertThat(storeFulfillmentRepository.findByStoreOrderId(conflictedOrder.getId())).isEmpty();
        assertThat(outboxEventRepository.findByAggregateIdAndEventType(conflictedOrder.getId(), "STORE_ORDER_PAID")).isEmpty();

        product.updateStockQuantity(1);
        productRepository.save(product);

        ApiTestClient.ApiTestResponse resolved = api.postJson(
                "/api/store/admin/orders/" + conflictedOrder.getId() + "/retry-processing",
                Map.of(),
                adminHeaders(store.getSlug(), adminEmail)
        );

        assertThat(resolved.status()).isEqualTo(200);
        assertThat(resolved.body().get("status")).isEqualTo("PAID");
        assertThat(resolved.body().get("resolved")).isEqualTo(true);
        assertThat(storeOrderRepository.findById(conflictedOrder.getId()).orElseThrow().getStatus()).isEqualTo(StoreOrderStatus.PAID);
        UUID fulfillmentId = UUID.fromString(resolved.body().get("fulfillmentId").toString());
        assertThat(storeFulfillmentRepository.findByStoreOrderId(conflictedOrder.getId())).isPresent();
        assertThat(outboxEventRepository.findByAggregateIdAndEventType(conflictedOrder.getId(), "STORE_ORDER_PAID")).hasSize(1);
        assertThat(productRepository.findById(product.getId()).orElseThrow().getStockQuantity()).isEqualTo(0);
        long fulfillmentCountAfterResolution = storeFulfillmentRepository.count();

        ApiTestClient.ApiTestResponse secondResolved = api.postJson(
                "/api/store/admin/orders/" + conflictedOrder.getId() + "/retry-processing",
                Map.of(),
                adminHeaders(store.getSlug(), adminEmail)
        );

        assertThat(secondResolved.status()).isEqualTo(200);
        assertThat(secondResolved.body().get("resolved")).isEqualTo(true);
        assertThat(UUID.fromString(secondResolved.body().get("fulfillmentId").toString())).isEqualTo(fulfillmentId);
        assertThat(storeFulfillmentRepository.findByStoreOrderId(conflictedOrder.getId())).isPresent();
        assertThat(storeFulfillmentRepository.count()).isEqualTo(fulfillmentCountAfterResolution);
        assertThat(outboxEventRepository.findByAggregateIdAndEventType(conflictedOrder.getId(), "STORE_ORDER_PAID")).hasSize(1);
        assertThat(productRepository.findById(product.getId()).orElseThrow().getStockQuantity()).isEqualTo(0);

        ApiTestClient.ApiTestResponse detail = api.get(
                "/api/store/admin/orders/" + conflictedOrder.getId(),
                adminHeaders(store.getSlug(), adminEmail)
        );

        assertThat(detail.status()).isEqualTo(200);
        assertThat(detail.body().get("operationalIssue")).isNull();
        Map<String, Object> operationalSummary = castMap(detail.body().get("operationalSummary"));
        assertThat(operationalSummary.get("paymentConfirmed")).isEqualTo(true);
        assertThat(operationalSummary.get("hasOperationalConflict")).isEqualTo(false);
        assertThat(operationalSummary.get("hasFulfillment")).isEqualTo(true);
        assertThat(operationalSummary.get("canCancel")).isEqualTo(false);
        assertThat(operationalSummary.get("canRetryProcessing")).isEqualTo(false);
        List<Map<String, Object>> timeline = castList(detail.body().get("timeline"));
        assertThat(timeline).extracting(item -> item.get("code"))
                .contains("ORDER_CREATED", "PAYMENT_INITIATED", "PAYMENT_CONFIRMED", "STOCK_CONFLICT", "ORDER_PAID", "FULFILLMENT_CREATED");
    }

    @Test
    void retryProcessingRejectsPaidOrdersWithoutStockConflict() throws Exception {
        Store store = storeRepository.save(new Store(UUID.randomUUID(), "admin-retry-guard", "Admin Retry Guard"));
        String adminEmail = "admin-retry-guard@" + UUID.randomUUID() + ".test";
        createStoreUser(store, adminEmail, StoreMemberRole.ADMIN);
        Product product = productRepository.save(new Product(UUID.randomUUID(), store.getId(), "SKU-RETRY-GUARD", "Retry Guard Product", 500, 5));

        StoreOrder order;
        try {
            TenantContext.setStoreSlug(store.getSlug());
            order = checkoutStoreOrderService.checkout(List.of(new CheckoutItem(product.getId(), 1)), null, null, "retry@example.com");
        } finally {
            TenantContext.clear();
        }

        storePaymentConfirmationService.confirmStorePayment(
                UUID.randomUUID(),
                order.getId(),
                "mp_retry_guard_" + UUID.randomUUID(),
                order.getTotalAmount(),
                order.getCurrency()
        );

        assertThat(storeOrderRepository.findById(order.getId()).orElseThrow().getStatus()).isEqualTo(StoreOrderStatus.PAID);
        assertThat(outboxEventRepository.findByAggregateIdAndEventType(order.getId(), "STORE_ORDER_STOCK_CONFLICT")).isEmpty();
        assertThat(storeFulfillmentRepository.findByStoreOrderId(order.getId())).isPresent();

        ApiTestClient.ApiTestResponse response = api.postJson(
                "/api/store/admin/orders/" + order.getId() + "/retry-processing",
                Map.of(),
                adminHeaders(store.getSlug(), adminEmail)
        );

        assertThat(response.status()).isEqualTo(409);
        assertThat(castMap(response.body().get("error")).get("code")).isEqualTo("order_retry_not_available");
    }

    @Test
    void adminListExposesDerivedIndicatorsAndSupportsOperationalFilters() throws Exception {
        Store store = storeRepository.save(new Store(UUID.randomUUID(), "admin-list", "Admin List"));
        String adminEmail = "admin-list@" + UUID.randomUUID() + ".test";
        createStoreUser(store, adminEmail, StoreMemberRole.ADMIN);
        Product product = productRepository.save(new Product(UUID.randomUUID(), store.getId(), "SKU-LIST", "List Product", 900, 10));

        StoreOrder pendingOrder;
        StoreOrder conflictedOrder;
        StoreOrder fulfilledOrder;
        StoreOrder cancelledOrder;
        try {
            TenantContext.setStoreSlug(store.getSlug());
            pendingOrder = checkoutStoreOrderService.checkout(List.of(new CheckoutItem(product.getId(), 1)), null, null, "pending@example.com");
            conflictedOrder = checkoutStoreOrderService.checkout(List.of(new CheckoutItem(product.getId(), 1)), null, null, "conflicted-list@example.com");
            fulfilledOrder = checkoutStoreOrderService.checkout(List.of(new CheckoutItem(product.getId(), 1)), null, null, "fulfilled@example.com");
            cancelledOrder = checkoutStoreOrderService.checkout(List.of(new CheckoutItem(product.getId(), 1)), null, null, "cancelled@example.com");
        } finally {
            TenantContext.clear();
        }

        Payment conflictedPayment = new Payment(
                UUID.randomUUID(),
                PaymentScope.STORE,
                conflictedOrder.getId(),
                "MERCADOPAGO",
                "mp_list_conflict_" + UUID.randomUUID(),
                PaymentStatus.PENDING,
                conflictedOrder.getTotalAmount(),
                conflictedOrder.getCurrency()
        );
        conflictedPayment.markConfirmed();
        paymentRepository.save(conflictedPayment);

        outboxEventRepository.save(new com.barmi.domain.events.OutboxEvent(
                UUID.randomUUID(),
                "STORE_ORDER_STOCK_CONFLICT",
                PaymentScope.STORE.name(),
                conflictedOrder.getId(),
                """
                {"storeOrderId":"%s","storeId":"%s","paymentId":"%s","conflicts":[{"productId":"%s","sku":"SKU-LIST","availableQuantity":0,"requestedQuantity":1}]}
                """.formatted(conflictedOrder.getId(), store.getId(), conflictedPayment.getProviderPaymentId(), product.getId())
        ));

        Payment fulfilledPayment = new Payment(
                UUID.randomUUID(),
                PaymentScope.STORE,
                fulfilledOrder.getId(),
                "MERCADOPAGO",
                "mp_list_fulfilled_" + UUID.randomUUID(),
                PaymentStatus.PENDING,
                fulfilledOrder.getTotalAmount(),
                fulfilledOrder.getCurrency()
        );
        fulfilledPayment.markConfirmed();
        paymentRepository.save(fulfilledPayment);
        fulfilledOrder.markPaid();
        storeOrderRepository.save(fulfilledOrder);
        storeFulfillmentRepository.save(new StoreFulfillment(
                UUID.randomUUID(),
                fulfilledOrder.getId(),
                store.getId(),
                "DELIVERY",
                FulfillmentStatus.PENDING
        ));

        Payment cancelledPayment = new Payment(
                UUID.randomUUID(),
                PaymentScope.STORE,
                cancelledOrder.getId(),
                "MERCADOPAGO",
                "mp_list_cancelled_" + UUID.randomUUID(),
                PaymentStatus.PENDING,
                cancelledOrder.getTotalAmount(),
                cancelledOrder.getCurrency()
        );
        cancelledPayment.markConfirmed();
        paymentRepository.save(cancelledPayment);
        cancelledOrder.markPaid();
        cancelledOrder.cancel();
        storeOrderRepository.save(cancelledOrder);
        outboxEventRepository.save(new com.barmi.domain.events.OutboxEvent(
                UUID.randomUUID(),
                "STORE_ORDER_MANUALLY_CANCELLED",
                PaymentScope.STORE.name(),
                cancelledOrder.getId(),
                """
                {"storeOrderId":"%s","storeId":"%s","status":"CANCELLED","reason":"MANUAL_ADMIN_ACTION"}
                """.formatted(cancelledOrder.getId(), store.getId())
        ));

        ApiTestClient.ApiTestResponse list = api.get(
                "/api/store/admin/orders?page=0&size=20",
                adminHeaders(store.getSlug(), adminEmail)
        );

        assertThat(list.status()).isEqualTo(200);
        List<Map<String, Object>> content = castList(list.body().get("content"));
        assertThat(content).hasSize(4);

        Map<String, Object> pendingRow = findOrder(content, pendingOrder.getId());
        assertThat(pendingRow.get("paymentConfirmed")).isEqualTo(false);
        assertThat(pendingRow.get("hasFulfillment")).isEqualTo(false);
        assertThat(pendingRow.get("manuallyCancelled")).isEqualTo(false);
        assertThat(pendingRow.get("canCancel")).isEqualTo(true);
        assertThat(pendingRow.get("canRetryProcessing")).isEqualTo(false);
        assertThat(pendingRow.get("operationalIssue")).isNull();

        Map<String, Object> conflictedRow = findOrder(content, conflictedOrder.getId());
        assertThat(castMap(conflictedRow.get("operationalIssue")).get("code")).isEqualTo("STOCK_CONFLICT");
        assertThat(conflictedRow.get("paymentConfirmed")).isEqualTo(true);
        assertThat(conflictedRow.get("hasFulfillment")).isEqualTo(false);
        assertThat(conflictedRow.get("canCancel")).isEqualTo(true);
        assertThat(conflictedRow.get("canRetryProcessing")).isEqualTo(true);

        Map<String, Object> fulfilledRow = findOrder(content, fulfilledOrder.getId());
        assertThat(fulfilledRow.get("paymentConfirmed")).isEqualTo(true);
        assertThat(fulfilledRow.get("hasFulfillment")).isEqualTo(true);
        assertThat(fulfilledRow.get("canCancel")).isEqualTo(false);
        assertThat(fulfilledRow.get("canRetryProcessing")).isEqualTo(false);

        Map<String, Object> cancelledRow = findOrder(content, cancelledOrder.getId());
        assertThat(cancelledRow.get("manuallyCancelled")).isEqualTo(true);
        assertThat(cancelledRow.get("canCancel")).isEqualTo(false);
        assertThat(cancelledRow.get("canRetryProcessing")).isEqualTo(false);

        ApiTestClient.ApiTestResponse conflictFiltered = api.get(
                "/api/store/admin/orders?hasOperationalConflict=true",
                adminHeaders(store.getSlug(), adminEmail)
        );
        assertThat(conflictFiltered.status()).isEqualTo(200);
        List<Map<String, Object>> conflictContent = castList(conflictFiltered.body().get("content"));
        assertThat(conflictContent).hasSize(1);
        assertThat(conflictContent.get(0).get("orderId").toString()).isEqualTo(conflictedOrder.getId().toString());

        ApiTestClient.ApiTestResponse fulfillmentFiltered = api.get(
                "/api/store/admin/orders?hasFulfillment=true",
                adminHeaders(store.getSlug(), adminEmail)
        );
        assertThat(fulfillmentFiltered.status()).isEqualTo(200);
        List<Map<String, Object>> fulfillmentContent = castList(fulfillmentFiltered.body().get("content"));
        assertThat(fulfillmentContent).hasSize(1);
        assertThat(fulfillmentContent.get(0).get("orderId").toString()).isEqualTo(fulfilledOrder.getId().toString());
    }

    @Test
    void adminListSupportsOperationalDrillDownFilters() throws Exception {
        Store store = storeRepository.save(new Store(UUID.randomUUID(), "admin-drilldown", "Admin Drilldown"));
        String adminEmail = "admin-drilldown@" + UUID.randomUUID() + ".test";
        createStoreUser(store, adminEmail, StoreMemberRole.ADMIN);
        Product product = productRepository.save(new Product(UUID.randomUUID(), store.getId(), "SKU-DRILL", "Drill Product", 900, 10));

        StoreOrder createdOnly;
        StoreOrder paidOrder;
        StoreOrder cancelledOrder;
        StoreOrder conflictOrder;
        try {
            TenantContext.setStoreSlug(store.getSlug());
            createdOnly = checkoutStoreOrderService.checkout(List.of(new CheckoutItem(product.getId(), 1)), null, null, "created-only@example.com");
            paidOrder = checkoutStoreOrderService.checkout(List.of(new CheckoutItem(product.getId(), 1)), null, null, "paid-order@example.com");
            cancelledOrder = checkoutStoreOrderService.checkout(List.of(new CheckoutItem(product.getId(), 1)), null, null, "cancelled-order@example.com");
            conflictOrder = checkoutStoreOrderService.checkout(List.of(new CheckoutItem(product.getId(), 1)), null, null, "conflict-order@example.com");
        } finally {
            TenantContext.clear();
        }

        Payment paidPayment = new Payment(
                UUID.randomUUID(),
                PaymentScope.STORE,
                paidOrder.getId(),
                "MERCADOPAGO",
                "mp_drill_paid_" + UUID.randomUUID(),
                PaymentStatus.PENDING,
                paidOrder.getTotalAmount(),
                paidOrder.getCurrency()
        );
        paidPayment.markConfirmed();
        paymentRepository.save(paidPayment);

        Payment conflictPayment = new Payment(
                UUID.randomUUID(),
                PaymentScope.STORE,
                conflictOrder.getId(),
                "MERCADOPAGO",
                "mp_drill_conflict_" + UUID.randomUUID(),
                PaymentStatus.PENDING,
                conflictOrder.getTotalAmount(),
                conflictOrder.getCurrency()
        );
        conflictPayment.markConfirmed();
        paymentRepository.save(conflictPayment);

        cancelledOrder.cancel();
        storeOrderRepository.save(cancelledOrder);

        outboxEventRepository.save(new com.barmi.domain.events.OutboxEvent(
                UUID.randomUUID(),
                "STORE_ORDER_MANUALLY_CANCELLED",
                PaymentScope.STORE.name(),
                cancelledOrder.getId(),
                "{\"storeOrderId\":\"%s\"}".formatted(cancelledOrder.getId())
        ));
        outboxEventRepository.save(new com.barmi.domain.events.OutboxEvent(
                UUID.randomUUID(),
                "STORE_ORDER_STOCK_CONFLICT",
                PaymentScope.STORE.name(),
                conflictOrder.getId(),
                "{\"storeOrderId\":\"%s\"}".formatted(conflictOrder.getId())
        ));

        Instant now = Instant.now();
        setOrderCreatedAt(createdOnly.getId(), now.minusSeconds(2 * 24L * 60L * 60L));
        setOrderCreatedAt(paidOrder.getId(), now.minusSeconds(2 * 24L * 60L * 60L));
        setOrderCreatedAt(cancelledOrder.getId(), now.minusSeconds(10 * 24L * 60L * 60L));
        setOrderCreatedAt(conflictOrder.getId(), now.minusSeconds(3 * 24L * 60L * 60L));
        setPaymentConfirmedAt(paidPayment.getId(), now.minusSeconds(2 * 24L * 60L * 60L));
        setPaymentConfirmedAt(conflictPayment.getId(), now.minusSeconds(15 * 24L * 60L * 60L));
        setEventOccurredAt("STORE_ORDER_MANUALLY_CANCELLED", cancelledOrder.getId(), now.minusSeconds(24L * 60L * 60L));
        setEventOccurredAt("STORE_ORDER_STOCK_CONFLICT", conflictOrder.getId(), now.minusSeconds(3 * 24L * 60L * 60L));

        ApiTestClient.ApiTestResponse createdFiltered = api.get(
                "/api/store/admin/orders?createdFrom=%s&createdTo=%s".formatted(
                        now.minusSeconds(7 * 24L * 60L * 60L),
                        now
                ),
                adminHeaders(store.getSlug(), adminEmail)
        );
        assertThat(createdFiltered.status()).isEqualTo(200);
        List<Map<String, Object>> createdContent = castList(createdFiltered.body().get("content"));
        assertThat(createdContent).extracting(item -> item.get("orderId").toString())
                .contains(createdOnly.getId().toString(), paidOrder.getId().toString(), conflictOrder.getId().toString())
                .doesNotContain(cancelledOrder.getId().toString());

        ApiTestClient.ApiTestResponse paidFiltered = api.get(
                "/api/store/admin/orders?paidFrom=%s&paidTo=%s".formatted(
                        now.minusSeconds(7 * 24L * 60L * 60L),
                        now
                ),
                adminHeaders(store.getSlug(), adminEmail)
        );
        assertThat(paidFiltered.status()).isEqualTo(200);
        List<Map<String, Object>> paidContent = castList(paidFiltered.body().get("content"));
        assertThat(paidContent).extracting(item -> item.get("orderId").toString())
                .contains(paidOrder.getId().toString())
                .doesNotContain(conflictOrder.getId().toString());

        ApiTestClient.ApiTestResponse cancelledFiltered = api.get(
                "/api/store/admin/orders?manuallyCancelled=true&manualCancelledFrom=%s&manualCancelledTo=%s".formatted(
                        now.minusSeconds(7 * 24L * 60L * 60L),
                        now
                ),
                adminHeaders(store.getSlug(), adminEmail)
        );
        assertThat(cancelledFiltered.status()).isEqualTo(200);
        List<Map<String, Object>> cancelledContent = castList(cancelledFiltered.body().get("content"));
        assertThat(cancelledContent).extracting(item -> item.get("orderId").toString())
                .containsExactly(cancelledOrder.getId().toString());

        ApiTestClient.ApiTestResponse conflictFiltered = api.get(
                "/api/store/admin/orders?hasConflictEvent=true&conflictFrom=%s&conflictTo=%s".formatted(
                        now.minusSeconds(7 * 24L * 60L * 60L),
                        now
                ),
                adminHeaders(store.getSlug(), adminEmail)
        );
        assertThat(conflictFiltered.status()).isEqualTo(200);
        List<Map<String, Object>> conflictContent = castList(conflictFiltered.body().get("content"));
        assertThat(conflictContent).extracting(item -> item.get("orderId").toString())
                .containsExactly(conflictOrder.getId().toString());
    }

    @Test
    void adminOrderReadsRequireAuthenticationAndAdminRole() throws Exception {
        Store store = storeRepository.save(new Store(UUID.randomUUID(), "admin-read-authz", "Admin Read Authz"));
        String adminEmail = "admin-read-authz@" + UUID.randomUUID() + ".test";
        String staffEmail = "staff-read-authz@" + UUID.randomUUID() + ".test";
        createStoreUser(store, adminEmail, StoreMemberRole.ADMIN);
        createStoreUser(store, staffEmail, StoreMemberRole.STAFF);
        Product product = productRepository.save(new Product(UUID.randomUUID(), store.getId(), "SKU-READ", "Read Product", 700, 2));

        StoreOrder order;
        try {
            TenantContext.setStoreSlug(store.getSlug());
            order = checkoutStoreOrderService.checkout(List.of(new CheckoutItem(product.getId(), 1)), null, null, "read@example.com");
        } finally {
            TenantContext.clear();
        }

        HttpHeaders unauthenticatedHeaders = api.storeHostHeaders(store.getSlug());

        ApiTestClient.ApiTestResponse unauthenticatedList = api.get(
                "/api/store/admin/orders",
                unauthenticatedHeaders
        );
        assertThat(unauthenticatedList.status()).isEqualTo(401);

        ApiTestClient.ApiTestResponse unauthenticatedDetail = api.get(
                "/api/store/admin/orders/" + order.getId(),
                unauthenticatedHeaders
        );
        assertThat(unauthenticatedDetail.status()).isEqualTo(401);

        ApiTestClient.ApiTestResponse staffList = api.get(
                "/api/store/admin/orders",
                authHeaders(store.getSlug(), staffEmail)
        );
        assertThat(staffList.status()).isEqualTo(403);
        assertThat(castMap(staffList.body().get("error")).get("code")).isEqualTo("forbidden");

        ApiTestClient.ApiTestResponse adminList = api.get(
                "/api/store/admin/orders",
                adminHeaders(store.getSlug(), adminEmail)
        );
        assertThat(adminList.status()).isEqualTo(200);
        assertThat(castList(adminList.body().get("content"))).hasSize(1);
    }

    private void createStoreUser(Store store, String email, StoreMemberRole role) {
        userRepository.save(new User(
                UUID.randomUUID(),
                email,
                passwordEncoder.encode("secret"),
                UserStatus.ACTIVE
        ));
        storeMemberRepository.save(new StoreMember(UUID.randomUUID(), store.getId(), email, role, StoreMemberStatus.ACTIVE));
    }

    private HttpHeaders adminHeaders(String storeSlug, String adminEmail) throws Exception {
        return authHeaders(storeSlug, adminEmail);
    }

    private HttpHeaders authHeaders(String storeSlug, String email) throws Exception {
        HttpHeaders headers = api.storeHostHeaders(storeSlug);
        headers.set("X-User-Email", email);
        headers.setBearerAuth(loginAndGetAccessToken(email));
        return headers;
    }

    private String loginAndGetAccessToken(String email) throws Exception {
        ApiTestClient.ApiTestResponse login = api.postJson(
                "/api/auth/login",
                Map.of("email", email, "password", "secret"),
                null
        );
        assertThat(login.status()).isEqualTo(200);
        return login.body().get("accessToken").toString();
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> castList(Object value) {
        return (List<Map<String, Object>>) value;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> castMap(Object value) {
        return (Map<String, Object>) value;
    }

    private Map<String, Object> findOrder(List<Map<String, Object>> content, UUID orderId) {
        return content.stream()
                .filter(item -> orderId.toString().equals(item.get("orderId").toString()))
                .findFirst()
                .orElseThrow();
    }

    private void setOrderCreatedAt(UUID orderId, Instant timestamp) {
        jdbcTemplate.update("update store_orders set created_at = ? where id = ?", Timestamp.from(timestamp), orderId);
    }

    private void setPaymentConfirmedAt(UUID paymentId, Instant timestamp) {
        jdbcTemplate.update("update payments set created_at = ?, confirmed_at = ? where id = ?", Timestamp.from(timestamp), Timestamp.from(timestamp), paymentId);
    }

    private void setEventOccurredAt(String eventType, UUID orderId, Instant timestamp) {
        jdbcTemplate.update("update outbox_events set occurred_at = ? where aggregate_id = ? and event_type = ?", Timestamp.from(timestamp), orderId, eventType);
    }
}
