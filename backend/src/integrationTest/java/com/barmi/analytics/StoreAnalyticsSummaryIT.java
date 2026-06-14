package com.barmi.analytics;

import com.barmi.PostgresIntegrationTestBase;
import com.barmi.domain.catalog.Product;
import com.barmi.domain.enums.PaymentScope;
import com.barmi.domain.events.OutboxEvent;
import com.barmi.domain.fulfillment.FulfillmentStatus;
import com.barmi.domain.fulfillment.StoreFulfillment;
import com.barmi.domain.orders.StoreOrder;
import com.barmi.domain.orders.StoreOrderItem;
import com.barmi.domain.orders.StoreOrderStatus;
import com.barmi.domain.payments.Payment;
import com.barmi.domain.payments.PaymentStatus;
import com.barmi.domain.store.Store;
import com.barmi.domain.store.StoreMember;
import com.barmi.domain.store.StoreMemberRole;
import com.barmi.domain.store.StoreMemberStatus;
import com.barmi.domain.users.User;
import com.barmi.domain.users.UserStatus;
import com.barmi.domain.beta.BetaProductEvent;
import com.barmi.infra.repo.ProductRepository;
import com.barmi.infra.repo.BetaProductEventRepository;
import com.barmi.infra.repo.EcosystemMemberRepository;
import com.barmi.infra.repo.OutboxEventRepository;
import com.barmi.infra.repo.PaymentRepository;
import com.barmi.infra.repo.RefreshTokenRepository;
import com.barmi.infra.repo.StoreFulfillmentRepository;
import com.barmi.infra.repo.StoreMemberRepository;
import com.barmi.infra.repo.StoreOrderItemRepository;
import com.barmi.infra.repo.StoreOrderRepository;
import com.barmi.infra.repo.StoreRepository;
import com.barmi.infra.repo.UserRepository;
import com.barmi.testsupport.ApiTestClient;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@Testcontainers
@AutoConfigureMockMvc
class StoreAnalyticsSummaryIT extends PostgresIntegrationTestBase {

    private final ApiTestClient api;
    private final StoreRepository storeRepository;
    private final StoreOrderRepository storeOrderRepository;
    private final StoreOrderItemRepository storeOrderItemRepository;
    private final StoreFulfillmentRepository storeFulfillmentRepository;
    private final ProductRepository productRepository;
    private final PaymentRepository paymentRepository;
    private final OutboxEventRepository outboxEventRepository;
    private final BetaProductEventRepository betaProductEventRepository;
    private final EcosystemMemberRepository ecosystemMemberRepository;
    private final StoreMemberRepository storeMemberRepository;
    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JdbcTemplate jdbcTemplate;

    private Store store;
    private Store otherStore;
    private String adminEmail;
    private String otherAdminEmail;

    @Autowired
    StoreAnalyticsSummaryIT(
            org.springframework.test.web.servlet.MockMvc mockMvc,
            StoreRepository storeRepository,
            StoreOrderRepository storeOrderRepository,
            StoreOrderItemRepository storeOrderItemRepository,
            StoreFulfillmentRepository storeFulfillmentRepository,
            ProductRepository productRepository,
            PaymentRepository paymentRepository,
            OutboxEventRepository outboxEventRepository,
            BetaProductEventRepository betaProductEventRepository,
            EcosystemMemberRepository ecosystemMemberRepository,
            StoreMemberRepository storeMemberRepository,
            UserRepository userRepository,
            RefreshTokenRepository refreshTokenRepository,
            PasswordEncoder passwordEncoder,
            JdbcTemplate jdbcTemplate
    ) {
        this.api = new ApiTestClient(mockMvc);
        this.storeRepository = storeRepository;
        this.storeOrderRepository = storeOrderRepository;
        this.storeOrderItemRepository = storeOrderItemRepository;
        this.storeFulfillmentRepository = storeFulfillmentRepository;
        this.productRepository = productRepository;
        this.paymentRepository = paymentRepository;
        this.outboxEventRepository = outboxEventRepository;
        this.betaProductEventRepository = betaProductEventRepository;
        this.ecosystemMemberRepository = ecosystemMemberRepository;
        this.storeMemberRepository = storeMemberRepository;
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.jdbcTemplate = jdbcTemplate;
    }

    @BeforeEach
    void setup() {
        refreshTokenRepository.deleteAll();
        ecosystemMemberRepository.deleteAll();
        storeMemberRepository.deleteAll();
        storeFulfillmentRepository.deleteAll();
        storeOrderItemRepository.deleteAll();
        storeOrderRepository.deleteAll();
        betaProductEventRepository.deleteAll();
        productRepository.deleteAll();
        userRepository.deleteAll();
        storeRepository.deleteAll();

        store = storeRepository.save(new Store(UUID.randomUUID(), "analytics-store-" + UUID.randomUUID(), "Analytics Store"));
        otherStore = storeRepository.save(new Store(UUID.randomUUID(), "analytics-store-2-" + UUID.randomUUID(), "Analytics Store 2"));

        adminEmail = "store-analytics-" + UUID.randomUUID() + "@example.com";
        otherAdminEmail = "store-analytics-other-" + UUID.randomUUID() + "@example.com";
        userRepository.save(new User(UUID.randomUUID(), adminEmail, passwordEncoder.encode("secret"), UserStatus.ACTIVE));
        userRepository.save(new User(UUID.randomUUID(), otherAdminEmail, passwordEncoder.encode("secret"), UserStatus.ACTIVE));

        storeMemberRepository.save(new StoreMember(UUID.randomUUID(), store.getId(), adminEmail, StoreMemberRole.ADMIN, StoreMemberStatus.ACTIVE));
        storeMemberRepository.save(new StoreMember(UUID.randomUUID(), otherStore.getId(), otherAdminEmail, StoreMemberRole.ADMIN, StoreMemberStatus.ACTIVE));

        StoreOrder pending = createOrder(store.getId(), new BigDecimal("100.00"));
        StoreOrder paid = createOrder(store.getId(), new BigDecimal("250.00"));
        paid.markPaid();
        StoreOrder cancelled = createOrder(store.getId(), new BigDecimal("180.00"));
        cancelled.cancel();
        storeOrderRepository.saveAll(List.of(pending, paid, cancelled));

        StoreOrder otherPaid = createOrder(otherStore.getId(), new BigDecimal("999.00"));
        otherPaid.markPaid();
        storeOrderRepository.save(otherPaid);

        storeFulfillmentRepository.saveAll(List.of(
                new StoreFulfillment(UUID.randomUUID(), paid.getId(), store.getId(), "DELIVERY", FulfillmentStatus.PENDING),
                new StoreFulfillment(UUID.randomUUID(), pending.getId(), store.getId(), "DELIVERY", FulfillmentStatus.DELIVERED),
                new StoreFulfillment(UUID.randomUUID(), otherPaid.getId(), otherStore.getId(), "DELIVERY", FulfillmentStatus.CANCELLED)
        ));

        productRepository.saveAll(List.of(
                new Product(UUID.randomUUID(), store.getId(), "SKU-1", "Mate", 1000),
                new Product(UUID.randomUUID(), store.getId(), "SKU-2", "Termo", 2000),
                new Product(UUID.randomUUID(), otherStore.getId(), "SKU-9", "Ajeno", 3000)
        ));
        Product inactive = productRepository.save(new Product(UUID.randomUUID(), store.getId(), "SKU-3", "Bombilla", 500));
        inactive.setActive(false);
        productRepository.save(inactive);
    }

    @Test
    void returnsScopedStoreSummaryAndExcludesCancelledFromConfirmedSales() throws Exception {
        ApiTestClient.ApiTestResponse response = api.get("/api/store/analytics/summary", adminHeaders());

        assertThat(response.status()).isEqualTo(200);
        assertThat(response.body().get("storeId")).isEqualTo(store.getId().toString());
        assertThat(response.body().get("storeSlug")).isEqualTo(store.getSlug());
        assertThat(response.body().get("totalOrders")).isEqualTo(3);
        assertThat(response.body().get("confirmedSalesTotalAmount")).isEqualTo(250.00);
        assertThat(response.body().get("confirmedSalesCurrency")).isEqualTo("ARS");
        assertThat(response.body().get("activeProducts")).isEqualTo(2);
        assertThat(response.body().get("inactiveProducts")).isEqualTo(1);

        Map<String, Object> ordersByStatus = castMap(response.body().get("ordersByStatus"));
        assertThat(ordersByStatus).containsEntry("PENDING_PAYMENT", 1).containsEntry("PAID", 1).containsEntry("CANCELLED", 1);

        Map<String, Object> fulfillmentsByStatus = castMap(response.body().get("fulfillmentsByStatus"));
        assertThat(fulfillmentsByStatus).containsEntry("PENDING", 1).containsEntry("DELIVERED", 1).containsEntry("CANCELLED", 0);
    }

    @Test
    void requiresStoreAdminAndCurrentTenantIsolation() throws Exception {
        ApiTestClient.ApiTestResponse otherTenantResponse = api.get("/api/store/analytics/summary", otherAdminHeaders());
        assertThat(otherTenantResponse.status()).isEqualTo(200);
        assertThat(otherTenantResponse.body().get("storeId")).isEqualTo(otherStore.getId().toString());
        assertThat(otherTenantResponse.body().get("totalOrders")).isEqualTo(1);
        assertThat(otherTenantResponse.body().get("confirmedSalesTotalAmount")).isEqualTo(999.00);

        User staffUser = userRepository.save(new User(UUID.randomUUID(), "store-staff-" + UUID.randomUUID() + "@example.com", passwordEncoder.encode("secret"), UserStatus.ACTIVE));
        storeMemberRepository.save(new StoreMember(UUID.randomUUID(), store.getId(), staffUser.getEmail(), StoreMemberRole.STAFF, StoreMemberStatus.ACTIVE));

        HttpHeaders staffHeaders = api.storeHostHeaders(store.getSlug());
        staffHeaders.setBearerAuth(login(staffUser.getEmail()));

        ApiTestClient.ApiTestResponse forbidden = api.get("/api/store/analytics/summary", staffHeaders);
        assertThat(forbidden.status()).isEqualTo(403);
        assertThat(errorCode(forbidden)).isEqualTo("forbidden");
    }

    @Test
    void returnsOperationalReportForSelectedRangeWithClearPeriodSemantics() throws Exception {
        StoreOrder recentCreated = createOrder(store.getId(), new BigDecimal("80.00"));
        StoreOrder recentPaid = createOrder(store.getId(), new BigDecimal("250.00"));
        recentPaid.markPaid();
        StoreOrder recentCancelled = createOrder(store.getId(), new BigDecimal("60.00"));
        recentCancelled.cancel();
        StoreOrder recentConflict = createOrder(store.getId(), new BigDecimal("120.00"));
        StoreOrder oldPaid = createOrder(store.getId(), new BigDecimal("999.00"));
        oldPaid.markPaid();
        StoreOrder todayPaid = createOrder(store.getId(), new BigDecimal("100.00"));
        todayPaid.markPaid();
        storeOrderRepository.saveAll(List.of(recentCreated, recentPaid, recentCancelled, recentConflict, oldPaid, todayPaid));

        Payment recentPaidPayment = confirmedPayment(recentPaid.getId(), recentPaid.getTotalAmount());
        Payment oldPaidPayment = confirmedPayment(oldPaid.getId(), oldPaid.getTotalAmount());
        Payment todayPaidPayment = confirmedPayment(todayPaid.getId(), todayPaid.getTotalAmount());
        paymentRepository.saveAll(List.of(recentPaidPayment, oldPaidPayment, todayPaidPayment));

        StoreFulfillment recentFulfillment = storeFulfillmentRepository.save(
                new StoreFulfillment(UUID.randomUUID(), recentPaid.getId(), store.getId(), "DELIVERY", FulfillmentStatus.PENDING)
        );
        StoreFulfillment oldFulfillment = storeFulfillmentRepository.save(
                new StoreFulfillment(UUID.randomUUID(), oldPaid.getId(), store.getId(), "DELIVERY", FulfillmentStatus.DELIVERED)
        );
        StoreFulfillment todayFulfillment = storeFulfillmentRepository.save(
                new StoreFulfillment(UUID.randomUUID(), todayPaid.getId(), store.getId(), "DELIVERY", FulfillmentStatus.DISPATCHED)
        );

        OutboxEvent cancellationEvent = outboxEventRepository.save(new OutboxEvent(
                UUID.randomUUID(),
                "STORE_ORDER_MANUALLY_CANCELLED",
                PaymentScope.STORE.name(),
                recentCancelled.getId(),
                "{\"storeOrderId\":\"%s\"}".formatted(recentCancelled.getId())
        ));
        OutboxEvent stockConflictEvent = outboxEventRepository.save(new OutboxEvent(
                UUID.randomUUID(),
                "STORE_ORDER_STOCK_CONFLICT",
                PaymentScope.STORE.name(),
                recentConflict.getId(),
                "{\"storeOrderId\":\"%s\"}".formatted(recentConflict.getId())
        ));

        Instant now = Instant.now();
        setOrderCreatedAt(recentCreated.getId(), now.minusSeconds(2 * 24L * 60L * 60L));
        setOrderCreatedAt(recentPaid.getId(), now.minusSeconds(3 * 24L * 60L * 60L));
        setOrderCreatedAt(recentCancelled.getId(), now.minusSeconds(5 * 24L * 60L * 60L));
        setOrderCreatedAt(recentConflict.getId(), now.minusSeconds(2 * 24L * 60L * 60L));
        setOrderCreatedAt(oldPaid.getId(), now.minusSeconds(20 * 24L * 60L * 60L));
        setOrderCreatedAt(todayPaid.getId(), now.minusSeconds(60 * 60L));

        setPaymentConfirmedAt(recentPaidPayment.getId(), now.minusSeconds(3 * 24L * 60L * 60L));
        setPaymentConfirmedAt(oldPaidPayment.getId(), now.minusSeconds(20 * 24L * 60L * 60L));
        setPaymentConfirmedAt(todayPaidPayment.getId(), now.minusSeconds(30 * 60L));

        setFulfillmentCreatedAt(recentFulfillment.getId(), now.minusSeconds(3 * 24L * 60L * 60L));
        setFulfillmentCreatedAt(oldFulfillment.getId(), now.minusSeconds(20 * 24L * 60L * 60L));
        setFulfillmentCreatedAt(todayFulfillment.getId(), now.minusSeconds(20 * 60L));

        setEventOccurredAt(cancellationEvent.getEventId(), now.minusSeconds(24L * 60L * 60L));
        setEventOccurredAt(stockConflictEvent.getEventId(), now.minusSeconds(2 * 24L * 60L * 60L));

        ApiTestClient.ApiTestResponse response = api.get("/api/store/analytics/report?range=7d", adminHeaders());

        assertThat(response.status()).isEqualTo(200);
        assertThat(response.body().get("rangeKey")).isEqualTo("7d");
        assertThat(response.body().get("timezone")).isEqualTo("America/Argentina/Buenos_Aires");

        Map<String, Object> periodMetrics = castMap(response.body().get("periodMetrics"));
        assertThat(periodMetrics.get("ordersCreated")).isEqualTo(8);
        assertThat(periodMetrics.get("paymentsConfirmed")).isEqualTo(2);
        assertThat(periodMetrics.get("ordersPaid")).isEqualTo(2);
        assertThat(periodMetrics.get("manualCancellations")).isEqualTo(1);
        assertThat(periodMetrics.get("stockConflicts")).isEqualTo(1);
        assertThat(periodMetrics.get("fulfillmentsCreated")).isEqualTo(4);
        assertThat(periodMetrics.get("confirmedSalesTotalAmount")).isEqualTo(350.00);
        assertThat(periodMetrics.get("confirmedSalesCurrency")).isEqualTo("ARS");

        Map<String, Object> currentSnapshot = castMap(response.body().get("currentSnapshot"));
        Map<String, Object> fulfillmentsByStatus = castMap(currentSnapshot.get("fulfillmentsByStatus"));
        assertThat(fulfillmentsByStatus).containsEntry("PENDING", 2).containsEntry("DISPATCHED", 1).containsEntry("DELIVERED", 2);
    }

    @Test
    void reportRequiresStoreAdminAndSupportsTodayRange() throws Exception {
        StoreOrder todayPaid = createOrder(otherStore.getId(), new BigDecimal("70.00"));
        todayPaid.markPaid();
        storeOrderRepository.save(todayPaid);

        Payment payment = confirmedPayment(todayPaid.getId(), todayPaid.getTotalAmount());
        paymentRepository.save(payment);
        setOrderCreatedAt(todayPaid.getId(), Instant.now().minusSeconds(30 * 60L));
        setPaymentConfirmedAt(payment.getId(), Instant.now().minusSeconds(15 * 60L));

        ApiTestClient.ApiTestResponse otherTenant = api.get("/api/store/analytics/report?range=today", otherAdminHeaders());
        assertThat(otherTenant.status()).isEqualTo(200);
        Map<String, Object> periodMetrics = castMap(otherTenant.body().get("periodMetrics"));
        assertThat(periodMetrics.get("ordersCreated")).isEqualTo(2);
        assertThat(periodMetrics.get("paymentsConfirmed")).isEqualTo(1);
        assertThat(periodMetrics.get("ordersPaid")).isEqualTo(1);
        assertThat(periodMetrics.get("confirmedSalesTotalAmount")).isEqualTo(70.00);

        User staffUser = userRepository.save(new User(UUID.randomUUID(), "store-report-staff-" + UUID.randomUUID() + "@example.com", passwordEncoder.encode("secret"), UserStatus.ACTIVE));
        storeMemberRepository.save(new StoreMember(UUID.randomUUID(), store.getId(), staffUser.getEmail(), StoreMemberRole.STAFF, StoreMemberStatus.ACTIVE));

        HttpHeaders staffHeaders = api.storeHostHeaders(store.getSlug());
        staffHeaders.setBearerAuth(login(staffUser.getEmail()));

        ApiTestClient.ApiTestResponse forbidden = api.get("/api/store/analytics/report?range=7d", staffHeaders);
        assertThat(forbidden.status()).isEqualTo(403);
        assertThat(errorCode(forbidden)).isEqualTo("forbidden");
    }

    @Test
    void returnsStoreProductAnalyticsForLastSevenDaysWithScopedAggregationAndZeroRows() throws Exception {
        Product apple = productRepository.save(new Product(UUID.randomUUID(), store.getId(), "SKU-APPLE-ANALYTICS", "Apple Analytics", 1500, 8));
        Product banana = productRepository.save(new Product(UUID.randomUUID(), store.getId(), "SKU-BANANA-ANALYTICS", "Banana Analytics", 900, 6));
        Product noEvents = productRepository.save(new Product(UUID.randomUUID(), store.getId(), "SKU-NO-EVENTS", "No Events", 700, 4));
        Product foreign = productRepository.save(new Product(UUID.randomUUID(), otherStore.getId(), "SKU-FOREIGN-ANALYTICS", "Foreign Analytics", 1200, 5));
        Instant now = Instant.now();

        saveProductTelemetry(store.getSlug(), apple.getPublicSlug(), "public_product_card_clicked", now.minusSeconds(2 * 24L * 60L * 60L), 4);
        saveProductTelemetry(store.getSlug(), apple.getPublicSlug(), "public_product_detail_viewed", now.minusSeconds(2 * 24L * 60L * 60L), 2);
        saveProductTelemetry(store.getSlug(), apple.getPublicSlug(), "public_product_detail_add_to_cart", now.minusSeconds(60L * 60L), 1);
        saveProductTelemetry(store.getSlug(), banana.getPublicSlug(), "public_product_card_clicked", now.minusSeconds(3 * 24L * 60L * 60L), 1);
        saveProductTelemetry(store.getSlug(), banana.getPublicSlug(), "public_product_detail_viewed", now.minusSeconds(3 * 24L * 60L * 60L), 1);
        saveProductTelemetry(store.getSlug(), banana.getPublicSlug(), "public_product_detail_add_to_cart", now.minusSeconds(10 * 24L * 60L * 60L), 1);
        saveProductTelemetry(otherStore.getSlug(), foreign.getPublicSlug(), "public_product_detail_add_to_cart", now.minusSeconds(60L), 9);

        ApiTestClient.ApiTestResponse response = api.get("/api/store/analytics/products?range=7d", adminHeaders());

        assertThat(response.status()).isEqualTo(200);
        assertThat(response.body().get("storeId")).isEqualTo(store.getId().toString());
        assertThat(response.body().get("storeSlug")).isEqualTo(store.getSlug());
        assertThat(response.body().get("rangeKey")).isEqualTo("7d");

        Map<String, Object> totals = castMap(response.body().get("totals"));
        assertThat(totals.get("detailViews")).isEqualTo(3);
        assertThat(totals.get("cardClicks")).isEqualTo(5);
        assertThat(totals.get("addToCart")).isEqualTo(1);
        assertThat(totals.get("ctrPercent")).isEqualTo(60.0);
        assertThat(totals.get("addToCartRatePercent")).isEqualTo(33.33);

        List<Map<String, Object>> products = castList(response.body().get("products"));
        assertThat(products).extracting(row -> row.get("productSlug")).contains(
                apple.getPublicSlug(),
                banana.getPublicSlug(),
                noEvents.getPublicSlug()
        ).doesNotContain(foreign.getPublicSlug());
        assertThat(products.get(0).get("productSlug")).isEqualTo(apple.getPublicSlug());

        Map<String, Object> appleRow = findProductRow(products, apple.getPublicSlug());
        assertThat(appleRow).containsEntry("detailViews", 2)
                .containsEntry("cardClicks", 4)
                .containsEntry("addToCart", 1)
                .containsEntry("ctrPercent", 50.0)
                .containsEntry("addToCartRatePercent", 50.0);

        Map<String, Object> bananaRow = findProductRow(products, banana.getPublicSlug());
        assertThat(bananaRow).containsEntry("detailViews", 1)
                .containsEntry("cardClicks", 1)
                .containsEntry("addToCart", 0)
                .containsEntry("ctrPercent", 100.0)
                .containsEntry("addToCartRatePercent", 0.0);

        Map<String, Object> zeroRow = findProductRow(products, noEvents.getPublicSlug());
        assertThat(zeroRow).containsEntry("detailViews", 0)
                .containsEntry("cardClicks", 0)
                .containsEntry("addToCart", 0)
                .containsEntry("ctrPercent", 0.0)
                .containsEntry("addToCartRatePercent", 0.0);
    }

    @Test
    void returnsCommerceAnalyticsForPaidOrdersInCurrentStore() throws Exception {
        storeFulfillmentRepository.deleteAll();
        storeOrderItemRepository.deleteAll();
        storeOrderRepository.deleteAll();

        Product bread = productRepository.save(new Product(UUID.randomUUID(), store.getId(), "SKU-BREAD-COMMERCE", "Pan de campo", 1200, 20));
        Product coffee = productRepository.save(new Product(UUID.randomUUID(), store.getId(), "SKU-COFFEE-COMMERCE", "Cafe molido", 2500, 12));
        Product foreign = productRepository.save(new Product(UUID.randomUUID(), otherStore.getId(), "SKU-FOREIGN-COMMERCE", "Ajeno", 9999, 4));
        Instant now = Instant.now();

        StoreOrder firstPaid = savePaidOrderWithItems(store.getId(), List.of(
                new CommerceItemFixture(bread, 2, new BigDecimal("12.00"), new BigDecimal("24.00")),
                new CommerceItemFixture(coffee, 1, new BigDecimal("30.00"), new BigDecimal("30.00"))
        ), new BigDecimal("54.00"));
        StoreOrder secondPaid = savePaidOrderWithItems(store.getId(), List.of(
                new CommerceItemFixture(bread, 1, new BigDecimal("12.00"), new BigDecimal("12.00"))
        ), new BigDecimal("31.00"));
        StoreOrder pending = saveOrderWithItems(store.getId(), StoreOrderStatus.PENDING_PAYMENT, List.of(
                new CommerceItemFixture(bread, 9, new BigDecimal("12.00"), new BigDecimal("108.00"))
        ), new BigDecimal("108.00"));
        StoreOrder oldPaid = savePaidOrderWithItems(store.getId(), List.of(
                new CommerceItemFixture(coffee, 5, new BigDecimal("30.00"), new BigDecimal("150.00"))
        ), new BigDecimal("150.00"));
        StoreOrder foreignPaid = savePaidOrderWithItems(otherStore.getId(), List.of(
                new CommerceItemFixture(foreign, 7, new BigDecimal("99.99"), new BigDecimal("699.93"))
        ), new BigDecimal("699.93"));

        setOrderCreatedAt(firstPaid.getId(), now.minusSeconds(24L * 60L * 60L));
        setOrderCreatedAt(secondPaid.getId(), now.minusSeconds(2 * 24L * 60L * 60L));
        setOrderCreatedAt(pending.getId(), now.minusSeconds(60L));
        setOrderCreatedAt(oldPaid.getId(), now.minusSeconds(10 * 24L * 60L * 60L));
        setOrderCreatedAt(foreignPaid.getId(), now.minusSeconds(60L));

        ApiTestClient.ApiTestResponse response = api.get("/api/store/analytics/commerce?range=7d", adminHeaders());

        assertThat(response.status()).isEqualTo(200);
        assertThat(response.body()).containsEntry("orders", 2)
                .containsEntry("revenueCents", 8500)
                .containsEntry("averageOrderValueCents", 4250)
                .containsEntry("productsSold", 4);

        List<Map<String, Object>> topProducts = castList(response.body().get("topProducts"));
        assertThat(topProducts).hasSize(2);
        assertThat(topProducts.get(0)).containsEntry("productSlug", bread.getPublicSlug())
                .containsEntry("productName", "Pan de campo")
                .containsEntry("quantitySold", 3)
                .containsEntry("revenueCents", 3600);
        assertThat(topProducts.get(1)).containsEntry("productSlug", coffee.getPublicSlug())
                .containsEntry("productName", "Cafe molido")
                .containsEntry("quantitySold", 1)
                .containsEntry("revenueCents", 3000);
        assertThat(topProducts).extracting(row -> row.get("productSlug")).doesNotContain(foreign.getPublicSlug());
    }

    @Test
    void returnsFunnelAnalyticsForCurrentStoreUsingExistingDiscoveryAndCommerceData() throws Exception {
        storeFulfillmentRepository.deleteAll();
        storeOrderItemRepository.deleteAll();
        storeOrderRepository.deleteAll();
        betaProductEventRepository.deleteAll();

        Product bread = productRepository.save(new Product(UUID.randomUUID(), store.getId(), "SKU-BREAD-FUNNEL", "Pan funnel", 1200, 20));
        Product foreign = productRepository.save(new Product(UUID.randomUUID(), otherStore.getId(), "SKU-FOREIGN-FUNNEL", "Ajeno funnel", 9999, 4));
        Instant now = Instant.now();

        saveStoreTelemetry(store.getSlug(), "public_product_list_viewed", now.minusSeconds(2 * 24L * 60L * 60L), 10);
        saveProductTelemetry(store.getSlug(), bread.getPublicSlug(), "public_product_card_clicked", now.minusSeconds(2 * 24L * 60L * 60L), 4);
        saveProductTelemetry(store.getSlug(), bread.getPublicSlug(), "public_product_detail_viewed", now.minusSeconds(24L * 60L * 60L), 3);
        saveProductTelemetry(store.getSlug(), bread.getPublicSlug(), "public_product_detail_add_to_cart", now.minusSeconds(60L * 60L), 2);
        saveStoreTelemetry(store.getSlug(), "public_product_list_viewed", now.minusSeconds(10 * 24L * 60L * 60L), 99);
        saveStoreTelemetry(otherStore.getSlug(), "public_product_list_viewed", now.minusSeconds(60L), 8);
        saveProductTelemetry(otherStore.getSlug(), foreign.getPublicSlug(), "public_product_card_clicked", now.minusSeconds(60L), 8);

        StoreOrder paid = savePaidOrderWithItems(store.getId(), List.of(
                new CommerceItemFixture(bread, 1, new BigDecimal("50.00"), new BigDecimal("50.00"))
        ), new BigDecimal("50.00"));
        StoreOrder pending = saveOrderWithItems(store.getId(), StoreOrderStatus.PENDING_PAYMENT, List.of(
                new CommerceItemFixture(bread, 1, new BigDecimal("90.00"), new BigDecimal("90.00"))
        ), new BigDecimal("90.00"));
        StoreOrder oldPaid = savePaidOrderWithItems(store.getId(), List.of(
                new CommerceItemFixture(bread, 1, new BigDecimal("200.00"), new BigDecimal("200.00"))
        ), new BigDecimal("200.00"));
        StoreOrder foreignPaid = savePaidOrderWithItems(otherStore.getId(), List.of(
                new CommerceItemFixture(foreign, 1, new BigDecimal("999.00"), new BigDecimal("999.00"))
        ), new BigDecimal("999.00"));

        setOrderCreatedAt(paid.getId(), now.minusSeconds(24L * 60L * 60L));
        setOrderCreatedAt(pending.getId(), now.minusSeconds(60L));
        setOrderCreatedAt(oldPaid.getId(), now.minusSeconds(10 * 24L * 60L * 60L));
        setOrderCreatedAt(foreignPaid.getId(), now.minusSeconds(60L));

        ApiTestClient.ApiTestResponse response = api.get("/api/store/analytics/funnel?range=7d", adminHeaders());

        assertThat(response.status()).isEqualTo(200);
        assertThat(response.body()).containsEntry("listViews", 10)
                .containsEntry("cardClicks", 4)
                .containsEntry("detailViews", 3)
                .containsEntry("addToCart", 2)
                .containsEntry("orders", 1)
                .containsEntry("revenueCents", 5000)
                .containsEntry("clickRate", 0.4)
                .containsEntry("detailRate", 0.75)
                .containsEntry("addToCartRate", 0.6667)
                .containsEntry("purchaseRate", 0.5);
    }

    @Test
    void returnsZeroFunnelAnalyticsWithoutDivisionErrors() throws Exception {
        storeFulfillmentRepository.deleteAll();
        storeOrderItemRepository.deleteAll();
        storeOrderRepository.deleteAll();
        betaProductEventRepository.deleteAll();

        ApiTestClient.ApiTestResponse response = api.get("/api/store/analytics/funnel?range=7d", adminHeaders());

        assertThat(response.status()).isEqualTo(200);
        assertThat(response.body()).containsEntry("listViews", 0)
                .containsEntry("cardClicks", 0)
                .containsEntry("detailViews", 0)
                .containsEntry("addToCart", 0)
                .containsEntry("orders", 0)
                .containsEntry("revenueCents", 0)
                .containsEntry("clickRate", 0.0)
                .containsEntry("detailRate", 0.0)
                .containsEntry("addToCartRate", 0.0)
                .containsEntry("purchaseRate", 0.0);
    }

    private StoreOrder createOrder(UUID storeId, BigDecimal totalAmount) {
        return StoreOrder.create(
                UUID.randomUUID(),
                storeId,
                "ARS",
                totalAmount,
                totalAmount,
                BigDecimal.ZERO,
                "",
                null,
                null,
                List.of(new StoreOrderItem(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(), 1, totalAmount, totalAmount, "ARS", "{\"name\":\"Producto\"}"))
        );
    }

    private StoreOrder savePaidOrderWithItems(UUID storeId, List<CommerceItemFixture> items, BigDecimal totalAmount) {
        StoreOrder order = saveOrderWithItems(storeId, StoreOrderStatus.PAID, items, totalAmount);
        return order;
    }

    private StoreOrder saveOrderWithItems(UUID storeId, StoreOrderStatus status, List<CommerceItemFixture> items, BigDecimal totalAmount) {
        UUID orderId = UUID.randomUUID();
        StoreOrder order = StoreOrder.create(
                orderId,
                storeId,
                "ARS",
                totalAmount,
                totalAmount,
                BigDecimal.ZERO,
                "",
                null,
                null,
                items.stream()
                        .map(item -> new StoreOrderItem(
                                UUID.randomUUID(),
                                orderId,
                                item.product().getId(),
                                item.qty(),
                                item.unitPriceAmount(),
                                item.lineTotalAmount(),
                                "ARS",
                                "{\"name\":\"%s\"}".formatted(item.product().getName())
                        ))
                        .toList()
        );
        if (status == StoreOrderStatus.PAID) {
            order.markPaid();
        } else if (status == StoreOrderStatus.CANCELLED) {
            order.cancel();
        }
        StoreOrder saved = storeOrderRepository.save(order);
        storeOrderItemRepository.saveAll(items.stream()
                .map(item -> new StoreOrderItem(
                        UUID.randomUUID(),
                        orderId,
                        item.product().getId(),
                        item.qty(),
                        item.unitPriceAmount(),
                        item.lineTotalAmount(),
                        "ARS",
                        "{\"name\":\"%s\"}".formatted(item.product().getName())
                ))
                .toList());
        return saved;
    }

    private record CommerceItemFixture(Product product, int qty, BigDecimal unitPriceAmount, BigDecimal lineTotalAmount) {}

    private Payment confirmedPayment(UUID orderId, BigDecimal amount) {
        Payment payment = new Payment(
                UUID.randomUUID(),
                PaymentScope.STORE,
                orderId,
                "MERCADOPAGO",
                "mp_" + UUID.randomUUID(),
                PaymentStatus.PENDING,
                amount,
                "ARS"
        );
        payment.markConfirmed();
        return payment;
    }

    private void setOrderCreatedAt(UUID orderId, Instant timestamp) {
        jdbcTemplate.update("update store_orders set created_at = ? where id = ?", Timestamp.from(timestamp), orderId);
    }

    private void setPaymentConfirmedAt(UUID paymentId, Instant timestamp) {
        jdbcTemplate.update("update payments set created_at = ?, confirmed_at = ? where id = ?", Timestamp.from(timestamp), Timestamp.from(timestamp), paymentId);
    }

    private void setFulfillmentCreatedAt(UUID fulfillmentId, Instant timestamp) {
        jdbcTemplate.update("update store_fulfillments set created_at = ? where id = ?", Timestamp.from(timestamp), fulfillmentId);
    }

    private void setEventOccurredAt(UUID eventId, Instant timestamp) {
        jdbcTemplate.update("update outbox_events set occurred_at = ? where event_id = ?", Timestamp.from(timestamp), eventId);
    }

    private void saveProductTelemetry(String storeSlug, String productSlug, String eventName, Instant occurredAt, int times) {
        for (int index = 0; index < times; index++) {
            betaProductEventRepository.save(new BetaProductEvent(
                    UUID.randomUUID(),
                    eventName,
                    "ENGAGEMENT",
                    null,
                    storeSlug,
                    null,
                    null,
                    productSlug,
                    null,
                    null,
                    "session-" + UUID.randomUUID(),
                    "/public/%s/products/%s".formatted(storeSlug, productSlug),
                    "test",
                    "test",
                    "{}",
                    occurredAt.plusMillis(index)
            ));
        }
    }

    private void saveStoreTelemetry(String storeSlug, String eventName, Instant occurredAt, int times) {
        for (int index = 0; index < times; index++) {
            betaProductEventRepository.save(new BetaProductEvent(
                    UUID.randomUUID(),
                    eventName,
                    "DISCOVERY",
                    null,
                    storeSlug,
                    null,
                    null,
                    null,
                    null,
                    null,
                    "session-" + UUID.randomUUID(),
                    "/public/%s".formatted(storeSlug),
                    "test",
                    "test",
                    "{}",
                    occurredAt.plusMillis(index)
            ));
        }
    }

    private HttpHeaders adminHeaders() throws Exception {
        HttpHeaders headers = api.storeHostHeaders(store.getSlug());
        headers.setBearerAuth(login(adminEmail));
        return headers;
    }

    private HttpHeaders otherAdminHeaders() throws Exception {
        HttpHeaders headers = api.storeHostHeaders(otherStore.getSlug());
        headers.setBearerAuth(login(otherAdminEmail));
        return headers;
    }

    private String login(String email) throws Exception {
        ApiTestClient.ApiTestResponse response = api.postJson("/api/auth/login", Map.of("email", email, "password", "secret"), null);
        assertThat(response.status()).isEqualTo(200);
        return response.body().get("accessToken").toString();
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> castMap(Object value) {
        return (Map<String, Object>) value;
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> castList(Object value) {
        return (List<Map<String, Object>>) value;
    }

    private Map<String, Object> findProductRow(List<Map<String, Object>> products, String productSlug) {
        return products.stream()
                .filter(row -> productSlug.equals(row.get("productSlug")))
                .findFirst()
                .orElseThrow();
    }

    private String errorCode(ApiTestClient.ApiTestResponse response) {
        return castMap(response.body().get("error")).get("code").toString();
    }
}
