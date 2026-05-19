package com.barmi.orders;

import com.barmi.app.orders.CheckoutStoreOrderService;
import com.barmi.app.orders.CheckoutStoreOrderService.CheckoutItem;
import com.barmi.app.tenant.TenantContext;
import com.barmi.domain.catalog.Product;
import com.barmi.domain.enums.PaymentScope;
import com.barmi.domain.events.OutboxEvent;
import com.barmi.domain.orders.StoreOrder;
import com.barmi.domain.payments.Payment;
import com.barmi.domain.payments.PaymentStatus;
import com.barmi.domain.shipping.StoreShippingZone;
import com.barmi.domain.shipping.ShippingZoneType;
import com.barmi.domain.store.Store;
import com.barmi.infra.repo.PaymentRepository;
import com.barmi.infra.repo.ProductRepository;
import com.barmi.infra.repo.OutboxEventRepository;
import com.barmi.infra.repo.StoreOrderRepository;
import com.barmi.infra.repo.StoreRepository;
import com.barmi.infra.repo.StoreShippingZoneRepository;
import com.barmi.testsupport.ApiTestClient;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.TestConstructor;
import org.springframework.test.web.servlet.MockMvc;
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
@org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
@TestConstructor(autowireMode = TestConstructor.AutowireMode.ALL)
@ActiveProfiles("integrationtest")
@AutoConfigureTestDatabase(replace = NONE)
class StoreOrderQueryIT {

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
    private final ProductRepository productRepository;
    private final StoreOrderRepository storeOrderRepository;
    private final StoreShippingZoneRepository storeShippingZoneRepository;
    private final CheckoutStoreOrderService checkoutStoreOrderService;
    private final PaymentRepository paymentRepository;
    private final OutboxEventRepository outboxEventRepository;
    private final ApiTestClient api;

    @Autowired
    StoreOrderQueryIT(
            StoreRepository storeRepository,
            ProductRepository productRepository,
            StoreOrderRepository storeOrderRepository,
            StoreShippingZoneRepository storeShippingZoneRepository,
            CheckoutStoreOrderService checkoutStoreOrderService,
            PaymentRepository paymentRepository,
            OutboxEventRepository outboxEventRepository,
            MockMvc mockMvc
    ) {
        this.storeRepository = storeRepository;
        this.productRepository = productRepository;
        this.storeOrderRepository = storeOrderRepository;
        this.storeShippingZoneRepository = storeShippingZoneRepository;
        this.checkoutStoreOrderService = checkoutStoreOrderService;
        this.paymentRepository = paymentRepository;
        this.outboxEventRepository = outboxEventRepository;
        this.api = new ApiTestClient(mockMvc);
    }

    @Test
    void getByIdRespectsTenantIsolation() throws Exception {
        Store storeA = storeRepository.save(new Store(UUID.randomUUID(), "store-a", "Store A"));
        Store storeB = storeRepository.save(new Store(UUID.randomUUID(), "store-b", "Store B"));
        Product product = productRepository.save(new Product(UUID.randomUUID(), storeA.getId(), "SKU1", "Latte", 500));

        StoreOrder order;
        try {
            TenantContext.setStoreSlug("store-a");
            order = checkoutStoreOrderService.checkout(List.of(new CheckoutItem(product.getId(), 1)), null, null, "tenant-a@example.com");
        } finally {
            TenantContext.clear();
        }

        ApiTestClient.ApiTestResponse crossTenant = api.get(
                "/api/store/orders/" + order.getId(),
                api.storeHostHeaders("store-b")
        );
        assertThat(crossTenant.status()).isEqualTo(404);
        Map<String, Object> error = (Map<String, Object>) crossTenant.body().get("error");
        assertThat(error.get("code")).isEqualTo("store_order_not_found");

        ApiTestClient.ApiTestResponse ok = api.get(
                "/api/store/orders/" + order.getId(),
                api.storeHostHeaders("store-a")
        );
        assertThat(ok.status()).isEqualTo(200);
    }

    @Test
    void listFiltersByStoreAndStatus() throws Exception {
        Store storeA = storeRepository.save(new Store(UUID.randomUUID(), "store-a2", "Store A2"));
        Store storeB = storeRepository.save(new Store(UUID.randomUUID(), "store-b2", "Store B2"));
        Product productA = productRepository.save(new Product(UUID.randomUUID(), storeA.getId(), "SKU2", "Tea", 300));
        Product productB = productRepository.save(new Product(UUID.randomUUID(), storeB.getId(), "SKU3", "Mocha", 400));

        UUID pendingId;
        UUID paidId;
        try {
            TenantContext.setStoreSlug("store-a2");
            StoreOrder pending = checkoutStoreOrderService.checkout(List.of(new CheckoutItem(productA.getId(), 1)), null, null, "pending-a@example.com");
            StoreOrder paid = checkoutStoreOrderService.checkout(List.of(new CheckoutItem(productA.getId(), 1)), null, null, "paid-a@example.com");
            paid.markPaid();
            storeOrderRepository.save(paid);

            assertThat(pending.getStoreId()).isEqualTo(storeA.getId());
            assertThat(paid.getStoreId()).isEqualTo(storeA.getId());
            pendingId = pending.getId();
            paidId = paid.getId();
        } finally {
            TenantContext.clear();
        }

        try {
            TenantContext.setStoreSlug("store-b2");
            checkoutStoreOrderService.checkout(List.of(new CheckoutItem(productB.getId(), 1)), null, null, "tenant-b@example.com");
        } finally {
            TenantContext.clear();
        }

        ApiTestClient.ApiTestResponse list = api.get(
                "/api/store/orders?page=0&size=20",
                api.storeHostHeaders("store-a2")
        );
        assertThat(list.status()).isEqualTo(200);
        Map<String, Object> listBody = list.body();
        assertThat(Long.parseLong(listBody.get("totalElements").toString())).isEqualTo(2L);
        List<Map<String, Object>> content = (List<Map<String, Object>>) listBody.get("content");
        assertThat(content).hasSize(2);
        List<String> storeAOrderIds = content.stream()
                .map(row -> row.get("orderId").toString())
                .toList();
        assertThat(storeAOrderIds).containsExactlyInAnyOrder(pendingId.toString(), paidId.toString());

        ApiTestClient.ApiTestResponse filtered = api.get(
                "/api/store/orders?status=PAID",
                api.storeHostHeaders("store-a2")
        );
        assertThat(filtered.status()).isEqualTo(200);
        List<Map<String, Object>> filteredContent = (List<Map<String, Object>>) filtered.body().get("content");
        assertThat(filteredContent).hasSize(1);
        assertThat(filteredContent.get(0).get("status")).isEqualTo("PAID");
        assertThat(filteredContent.get(0).get("orderId").toString()).isEqualTo(paidId.toString());
    }

    @Test
    void paymentVisibleOnlyWhenConfirmed() throws Exception {
        Store store = storeRepository.save(new Store(UUID.randomUUID(), "store-pay", "Store Pay"));
        Product product = productRepository.save(new Product(UUID.randomUUID(), store.getId(), "SKU9", "Cortado", 600));
        storeShippingZoneRepository.save(new StoreShippingZone(
                UUID.randomUUID(),
                store.getId(),
                ShippingZoneType.EXACT,
                "1234",
                null,
                null,
                new BigDecimal("5.00"),
                "ARS"
        ));

        StoreOrder order;
        try {
            TenantContext.setStoreSlug("store-pay");
            order = checkoutStoreOrderService.checkout(List.of(new CheckoutItem(product.getId(), 1)), new CheckoutStoreOrderService.ShippingRequest("1234"), null, "shipping-visibility@example.com");
        } finally {
            TenantContext.clear();
        }

        ApiTestClient.ApiTestResponse before = api.get(
                "/api/store/orders/" + order.getId(),
                api.storeHostHeaders("store-pay")
        );
        assertThat(before.status()).isEqualTo(200);
        assertThat(before.body()).containsKey("payment");
        assertThat(before.body().get("payment")).isNull();

        Payment payment = new Payment(
                UUID.randomUUID(),
                PaymentScope.STORE,
                order.getId(),
                "MERCADOPAGO",
                "mp_store_confirmed",
                PaymentStatus.PENDING,
                order.getTotalAmount(),
                order.getCurrency()
        );
        payment.markConfirmed();
        paymentRepository.save(payment);

        ApiTestClient.ApiTestResponse after = api.get(
                "/api/store/orders/" + order.getId(),
                api.storeHostHeaders("store-pay")
        );
        assertThat(after.status()).isEqualTo(200);
        Map<String, Object> paymentBody = (Map<String, Object>) after.body().get("payment");
        assertThat(paymentBody.get("status")).isEqualTo("CONFIRMED");
        assertThat(paymentBody.get("providerPaymentId")).isEqualTo("mp_store_confirmed");
    }

    @Test
    void stockConflictIsVisibleInAdminListAndDetail() throws Exception {
        Store store = storeRepository.save(new Store(UUID.randomUUID(), "store-conflict", "Store Conflict"));
        Product product = productRepository.save(new Product(UUID.randomUUID(), store.getId(), "SKU-C", "Conflict Product", 600));

        StoreOrder order;
        try {
            TenantContext.setStoreSlug("store-conflict");
            order = checkoutStoreOrderService.checkout(List.of(new CheckoutItem(product.getId(), 1)), null, null, "conflict-visible@example.com");
        } finally {
            TenantContext.clear();
        }

        Payment payment = new Payment(
                UUID.randomUUID(),
                PaymentScope.STORE,
                order.getId(),
                "MERCADOPAGO",
                "mp_conflict_visible",
                PaymentStatus.PENDING,
                order.getTotalAmount(),
                order.getCurrency()
        );
        payment.markConfirmed();
        paymentRepository.save(payment);
        outboxEventRepository.save(new OutboxEvent(
                UUID.randomUUID(),
                "STORE_ORDER_STOCK_CONFLICT",
                PaymentScope.STORE.name(),
                order.getId(),
                """
                {"storeOrderId":"%s","storeId":"%s","paymentId":"mp_conflict_visible","conflicts":[{"productId":"%s","sku":"SKU-C","availableQuantity":0,"requestedQuantity":1}]}
                """.formatted(order.getId(), store.getId(), product.getId())
        ));

        ApiTestClient.ApiTestResponse list = api.get(
                "/api/store/orders?page=0&size=20",
                api.storeHostHeaders("store-conflict")
        );
        assertThat(list.status()).isEqualTo(200);
        List<Map<String, Object>> content = (List<Map<String, Object>>) list.body().get("content");
        assertThat(content).hasSize(1);
        Map<String, Object> issue = (Map<String, Object>) content.get(0).get("operationalIssue");
        assertThat(issue.get("code")).isEqualTo("STOCK_CONFLICT");
        assertThat(issue.get("title")).isEqualTo("Conflicto de stock post-pago");

        ApiTestClient.ApiTestResponse detail = api.get(
                "/api/store/orders/" + order.getId(),
                api.storeHostHeaders("store-conflict")
        );
        assertThat(detail.status()).isEqualTo(200);
        Map<String, Object> detailIssue = (Map<String, Object>) detail.body().get("operationalIssue");
        assertThat(detailIssue.get("code")).isEqualTo("STOCK_CONFLICT");
        assertThat(detailIssue.get("message")).toString().contains("stock");
        List<Map<String, Object>> items = (List<Map<String, Object>>) detailIssue.get("items");
        assertThat(items).hasSize(1);
        assertThat(items.get(0).get("sku")).isEqualTo("SKU-C");
        assertThat(items.get(0).get("availableQuantity")).isEqualTo(0);
        assertThat(items.get(0).get("requestedQuantity")).isEqualTo(1);
    }
}
