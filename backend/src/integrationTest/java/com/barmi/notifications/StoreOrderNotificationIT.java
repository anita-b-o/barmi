package com.barmi.notifications;

import com.barmi.app.fulfillment.UpdateFulfillmentStatusService;
import com.barmi.app.notifications.NotificationEmailSender;
import com.barmi.app.notifications.StoreOrderNotificationService;
import com.barmi.domain.catalog.Product;
import com.barmi.domain.events.OutboxEvent;
import com.barmi.domain.fulfillment.FulfillmentStatus;
import com.barmi.domain.orders.StoreOrder;
import com.barmi.domain.orders.StoreOrderItem;
import com.barmi.domain.store.Store;
import com.barmi.domain.store.StoreMember;
import com.barmi.domain.store.StoreMemberRole;
import com.barmi.domain.store.StoreMemberStatus;
import com.barmi.infra.repo.OutboxEventRepository;
import com.barmi.infra.repo.ProductRepository;
import com.barmi.infra.repo.StoreFulfillmentRepository;
import com.barmi.infra.repo.StoreMemberRepository;
import com.barmi.infra.repo.StoreOrderRepository;
import com.barmi.infra.repo.StoreRepository;
import com.barmi.testsupport.ApiTestClient;
import io.micrometer.core.instrument.Meter;
import io.micrometer.core.instrument.MeterRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.http.HttpHeaders;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.TestConstructor;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase.Replace.NONE;

@Testcontainers
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "jwt.secret=this_is_a_super_long_test_secret_key_that_is_at_least_32_bytes_long",
        "app.money.defaultCurrency=ARS",
        "app.mercadoPago.webhookSecret=secret",
        "app.security.allowDevIdentityHeader=true",
        "app.outbox.dispatcher.enabled=false"
})
@AutoConfigureMockMvc
@TestConstructor(autowireMode = TestConstructor.AutowireMode.ALL)
@ActiveProfiles("integrationtest")
@AutoConfigureTestDatabase(replace = NONE)
class StoreOrderNotificationIT {

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
    private final StoreFulfillmentRepository storeFulfillmentRepository;
    private final StoreMemberRepository storeMemberRepository;
    private final StoreOrderRepository storeOrderRepository;
    private final OutboxEventRepository outboxEventRepository;
    private final StoreOrderNotificationService storeOrderNotificationService;
    private final UpdateFulfillmentStatusService updateFulfillmentStatusService;
    private final MeterRegistry meterRegistry;
    private final InMemoryNotificationEmailSender emailSender;
    private final ApiTestClient api;

    @Autowired
    StoreOrderNotificationIT(
            StoreRepository storeRepository,
            ProductRepository productRepository,
            StoreFulfillmentRepository storeFulfillmentRepository,
            StoreMemberRepository storeMemberRepository,
            StoreOrderRepository storeOrderRepository,
            OutboxEventRepository outboxEventRepository,
            StoreOrderNotificationService storeOrderNotificationService,
            UpdateFulfillmentStatusService updateFulfillmentStatusService,
            MeterRegistry meterRegistry,
            InMemoryNotificationEmailSender emailSender,
            MockMvc mockMvc
    ) {
        this.storeRepository = storeRepository;
        this.productRepository = productRepository;
        this.storeFulfillmentRepository = storeFulfillmentRepository;
        this.storeMemberRepository = storeMemberRepository;
        this.storeOrderRepository = storeOrderRepository;
        this.outboxEventRepository = outboxEventRepository;
        this.storeOrderNotificationService = storeOrderNotificationService;
        this.updateFulfillmentStatusService = updateFulfillmentStatusService;
        this.meterRegistry = meterRegistry;
        this.emailSender = emailSender;
        this.api = new ApiTestClient(mockMvc);
    }

    @BeforeEach
    void clearSink() {
        emailSender.clear();
    }

    @Test
    void orderCreatedNotificationIsSentOnceAndContainsTrackingLink() throws Exception {
        Store store = storeRepository.save(new Store(UUID.randomUUID(), "notify-store", "Notify Store"));
        Product product = productRepository.save(new Product(UUID.randomUUID(), store.getId(), "SKU1", "Cafe", 1000, 10));

        HttpHeaders headers = api.storeHostHeaders(store.getSlug());

        ApiTestClient.ApiTestResponse checkoutResponse = api.postJson(
                "/api/store/checkout",
                Map.of(
                        "buyerEmail", "buyer@example.com",
                        "items", List.of(Map.of("productId", product.getId().toString(), "qty", 1))
                ),
                headers
        );

        assertThat(checkoutResponse.status()).isEqualTo(201);
        String orderId = checkoutResponse.body().get("orderId").toString();

        dispatchStoreNotifications();
        assertThat(emailSender.messages()).hasSize(1);
        NotificationEmailSender.EmailMessage message = emailSender.messages().get(0);
        assertThat(message.to()).isEqualTo("buyer@example.com");
        assertThat(message.subject()).contains("Orden creada");
        assertThat(message.body()).contains(orderId);
        assertThat(message.body()).contains("https://notify-store.example.com/store/orders/" + orderId);

        dispatchStoreNotifications();
        assertThat(emailSender.messages()).hasSize(1);
    }

    @Test
    void paymentConfirmedAndFulfillmentStartedSendNotificationsWithoutDuplicates() throws Exception {
        double buyerSentBefore = attempts("order_paid_buyer", "sent");
        double adminSentBefore = attempts("order_paid_admin", "sent");
        double duplicateBefore = attempts("order_paid_buyer", "skipped_duplicate");
        Store store = storeRepository.save(new Store(UUID.randomUUID(), "notify-paid", "Notify Paid"));
        storeMemberRepository.save(new StoreMember(
                UUID.randomUUID(),
                store.getId(),
                "admin-paid@example.com",
                StoreMemberRole.ADMIN,
                StoreMemberStatus.ACTIVE
        ));
        storeMemberRepository.save(new StoreMember(
                UUID.randomUUID(),
                store.getId(),
                "owner-paid@example.com",
                StoreMemberRole.OWNER,
                StoreMemberStatus.ACTIVE
        ));
        storeMemberRepository.save(new StoreMember(
                UUID.randomUUID(),
                store.getId(),
                "staff-paid@example.com",
                StoreMemberRole.STAFF,
                StoreMemberStatus.ACTIVE
        ));
        storeMemberRepository.save(new StoreMember(
                UUID.randomUUID(),
                store.getId(),
                "inactive-paid@example.com",
                StoreMemberRole.ADMIN,
                StoreMemberStatus.INACTIVE
        ));
        Product product = productRepository.save(new Product(UUID.randomUUID(), store.getId(), "SKU2", "Latte", 1200, 10));

        HttpHeaders checkoutHeaders = api.storeHostHeaders(store.getSlug());
        ApiTestClient.ApiTestResponse checkoutResponse = api.postJson(
                "/api/store/checkout",
                Map.of(
                        "buyerEmail", "paid@example.com",
                        "items", List.of(Map.of("productId", product.getId().toString(), "qty", 1))
                ),
                checkoutHeaders
        );
        UUID orderId = UUID.fromString(checkoutResponse.body().get("orderId").toString());

        dispatchStoreNotifications();
        emailSender.clear();

        HttpHeaders webhookHeaders = api.withWebhookSecret(new HttpHeaders(), "secret");
        ApiTestClient.ApiTestResponse webhookResponse = api.postJson(
                "/api/webhooks/mercadopago",
                Map.of(
                        "event_id", UUID.randomUUID().toString(),
                        "scope", "STORE",
                        "operation_id", orderId.toString(),
                        "provider_payment_id", "mp_notify_paid_1",
                        "status", "approved",
                        "amount", new BigDecimal("12.00"),
                        "currency", "ARS"
                ),
                webhookHeaders
        );
        assertThat(webhookResponse.status()).isEqualTo(200);

        dispatchStoreNotifications();

        assertThat(emailSender.messages()).hasSize(4);
        assertThat(emailSender.messages().stream().map(NotificationEmailSender.EmailMessage::subject).toList())
                .anyMatch(subject -> subject.contains("Pago confirmado"))
                .anyMatch(subject -> subject.contains("Nueva orden pagada"))
                .anyMatch(subject -> subject.contains("Empezamos a preparar"));
        assertThat(emailSender.messages().stream().map(NotificationEmailSender.EmailMessage::to).toList())
                .contains("paid@example.com", "admin-paid@example.com", "owner-paid@example.com")
                .doesNotContain("staff-paid@example.com", "inactive-paid@example.com");
        assertThat(attempts("order_paid_buyer", "sent") - buyerSentBefore).isEqualTo(1.0);
        assertThat(attempts("order_paid_admin", "sent") - adminSentBefore).isEqualTo(2.0);
        assertThat(latencyCount("order_paid_buyer")).isGreaterThan(0L);

        dispatchStoreNotifications();
        assertThat(emailSender.messages()).hasSize(4);

        OutboxEvent paidEvent = outboxEventRepository.findByAggregateIdAndEventType(orderId, "STORE_ORDER_PAID")
                .stream()
                .findFirst()
                .orElseThrow();
        storeOrderNotificationService.handle(paidEvent);
        assertThat(emailSender.messages()).hasSize(4);
        assertThat(attempts("order_paid_buyer", "skipped_duplicate") - duplicateBefore).isEqualTo(1.0);

        ApiTestClient.ApiTestResponse duplicateWebhookResponse = api.postJson(
                "/api/webhooks/mercadopago",
                Map.of(
                        "event_id", UUID.randomUUID().toString(),
                        "scope", "STORE",
                        "operation_id", orderId.toString(),
                        "provider_payment_id", "mp_notify_paid_1",
                        "status", "approved",
                        "amount", new BigDecimal("12.00"),
                        "currency", "ARS"
                ),
                webhookHeaders
        );
        assertThat(duplicateWebhookResponse.status()).isEqualTo(200);
        dispatchStoreNotifications();
        assertThat(emailSender.messages()).hasSize(4);
    }

    @Test
    void deliveredNotificationIsOnlySentWhenFulfillmentReachesDelivered() throws Exception {
        Store store = storeRepository.save(new Store(UUID.randomUUID(), "notify-delivered", "Notify Delivered"));
        Product product = productRepository.save(new Product(UUID.randomUUID(), store.getId(), "SKU3", "Tostado", 900, 10));

        HttpHeaders checkoutHeaders = api.storeHostHeaders(store.getSlug());
        ApiTestClient.ApiTestResponse checkoutResponse = api.postJson(
                "/api/store/checkout",
                Map.of(
                        "buyerEmail", "delivered@example.com",
                        "items", List.of(Map.of("productId", product.getId().toString(), "qty", 1))
                ),
                checkoutHeaders
        );
        UUID orderId = UUID.fromString(checkoutResponse.body().get("orderId").toString());

        dispatchStoreNotifications();
        emailSender.clear();

        HttpHeaders webhookHeaders = api.withWebhookSecret(new HttpHeaders(), "secret");
        api.postJson(
                "/api/webhooks/mercadopago",
                Map.of(
                        "event_id", UUID.randomUUID().toString(),
                        "scope", "STORE",
                        "operation_id", orderId.toString(),
                        "provider_payment_id", "mp_notify_paid_2",
                        "status", "approved",
                        "amount", new BigDecimal("9.00"),
                        "currency", "ARS"
                ),
                webhookHeaders
        );
        dispatchStoreNotifications();
        emailSender.clear();

        var fulfillment = storeFulfillmentRepository.findByStoreOrderId(orderId).orElseThrow();

        com.barmi.app.tenant.TenantContext.setStoreSlug(store.getSlug());
        try {
            updateFulfillmentStatusService.updateStatus(fulfillment.getId(), FulfillmentStatus.DISPATCHED);
            updateFulfillmentStatusService.updateStatus(fulfillment.getId(), FulfillmentStatus.DELIVERED);
        } finally {
            com.barmi.app.tenant.TenantContext.clear();
        }

        dispatchStoreNotifications();

        assertThat(emailSender.messages()).hasSize(1);
        NotificationEmailSender.EmailMessage message = emailSender.messages().get(0);
        assertThat(message.subject()).contains("Entrega completada");
        assertThat(message.body()).contains(orderId.toString());
    }

    @Test
    void paidOrderWithoutBuyerEmailStillNotifiesStoreAdmins() {
        Store store = storeRepository.save(new Store(UUID.randomUUID(), "notify-admin-legacy", "Notify Admin Legacy"));
        storeMemberRepository.save(new StoreMember(
                UUID.randomUUID(),
                store.getId(),
                "legacy-admin@example.com",
                StoreMemberRole.ADMIN,
                StoreMemberStatus.ACTIVE
        ));
        Product product = productRepository.save(new Product(UUID.randomUUID(), store.getId(), "SKU4", "Flat White", 1500, 10));
        UUID orderId = UUID.randomUUID();
        StoreOrder order = StoreOrder.create(
                orderId,
                store.getId(),
                "ARS",
                new BigDecimal("15.00"),
                new BigDecimal("15.00"),
                BigDecimal.ZERO,
                "",
                null,
                null,
                List.of(new StoreOrderItem(
                        UUID.randomUUID(),
                        orderId,
                        product.getId(),
                        1,
                        new BigDecimal("15.00"),
                        new BigDecimal("15.00"),
                        "ARS",
                        "{}"
                ))
        );
        order.markPaid();
        storeOrderRepository.save(order);

        OutboxEvent paidEvent = outboxEventRepository.save(new OutboxEvent(
                UUID.randomUUID(),
                "STORE_ORDER_PAID",
                "STORE",
                orderId,
                "{}"
        ));

        storeOrderNotificationService.handle(paidEvent);

        assertThat(emailSender.messages()).hasSize(1);
        NotificationEmailSender.EmailMessage message = emailSender.messages().get(0);
        assertThat(message.to()).isEqualTo("legacy-admin@example.com");
        assertThat(message.subject()).contains("Nueva orden pagada");
    }

    @Test
    void adminRecipientsAreNormalizedAndDeduplicatedCaseInsensitively() {
        double sentBefore = attempts("order_paid_admin", "sent");
        double duplicateBefore = attempts("order_paid_admin", "skipped_duplicate");
        double invalidBefore = attempts("order_paid_admin", "skipped_invalid_recipient");
        Store store = storeRepository.save(new Store(UUID.randomUUID(), "notify-admin-dedupe", "Notify Admin Dedupe"));
        storeMemberRepository.save(new StoreMember(
                UUID.randomUUID(),
                store.getId(),
                "DUP-ADMIN@example.com",
                StoreMemberRole.ADMIN,
                StoreMemberStatus.ACTIVE
        ));
        storeMemberRepository.save(new StoreMember(
                UUID.randomUUID(),
                store.getId(),
                " dup-admin@EXAMPLE.com ",
                StoreMemberRole.OWNER,
                StoreMemberStatus.ACTIVE
        ));
        storeMemberRepository.save(new StoreMember(
                UUID.randomUUID(),
                store.getId(),
                "not-an-email",
                StoreMemberRole.ADMIN,
                StoreMemberStatus.ACTIVE
        ));
        StoreOrder order = createPaidOrderWithoutBuyer(store, "SKU5", "Cortado", new BigDecimal("11.00"));
        OutboxEvent paidEvent = savePaidEvent(order.getId());

        storeOrderNotificationService.handle(paidEvent);

        assertThat(emailSender.messages()).hasSize(1);
        assertThat(emailSender.messages().get(0).to()).isEqualTo("dup-admin@example.com");
        assertThat(emailSender.messages().get(0).subject()).contains("Nueva orden pagada");
        assertThat(attempts("order_paid_admin", "sent") - sentBefore).isEqualTo(1.0);
        assertThat(attempts("order_paid_admin", "skipped_duplicate") - duplicateBefore).isEqualTo(1.0);
        assertThat(attempts("order_paid_admin", "skipped_invalid_recipient") - invalidBefore).isEqualTo(1.0);
    }

    @Test
    void sameAddressAsBuyerAndAdminReceivesDistinctTemplatesOnceEach() throws Exception {
        double buyerSentBefore = attempts("order_paid_buyer", "sent");
        double adminSentBefore = attempts("order_paid_admin", "sent");
        Store store = storeRepository.save(new Store(UUID.randomUUID(), "notify-same-recipient", "Notify Same Recipient"));
        storeMemberRepository.save(new StoreMember(
                UUID.randomUUID(),
                store.getId(),
                "same@example.com",
                StoreMemberRole.ADMIN,
                StoreMemberStatus.ACTIVE
        ));
        Product product = productRepository.save(new Product(UUID.randomUUID(), store.getId(), "SKU6", "Mocha", 1300, 10));

        ApiTestClient.ApiTestResponse checkoutResponse = api.postJson(
                "/api/store/checkout",
                Map.of(
                        "buyerEmail", "same@example.com",
                        "items", List.of(Map.of("productId", product.getId().toString(), "qty", 1))
                ),
                api.storeHostHeaders(store.getSlug())
        );
        UUID orderId = UUID.fromString(checkoutResponse.body().get("orderId").toString());
        dispatchStoreNotifications();
        emailSender.clear();

        ApiTestClient.ApiTestResponse webhookResponse = api.postJson(
                "/api/webhooks/mercadopago",
                Map.of(
                        "event_id", UUID.randomUUID().toString(),
                        "scope", "STORE",
                        "operation_id", orderId.toString(),
                        "provider_payment_id", "mp_notify_same_recipient",
                        "status", "approved",
                        "amount", new BigDecimal("13.00"),
                        "currency", "ARS"
                ),
                api.withWebhookSecret(new HttpHeaders(), "secret")
        );
        assertThat(webhookResponse.status()).isEqualTo(200);

        dispatchStoreNotifications();

        assertThat(emailSender.messages().stream()
                .filter(message -> message.to().equals("same@example.com"))
                .map(NotificationEmailSender.EmailMessage::subject)
                .toList())
                .anyMatch(subject -> subject.contains("Pago confirmado"))
                .anyMatch(subject -> subject.contains("Nueva orden pagada"));
        assertThat(attempts("order_paid_buyer", "sent") - buyerSentBefore).isEqualTo(1.0);
        assertThat(attempts("order_paid_admin", "sent") - adminSentBefore).isEqualTo(1.0);
    }

    @Test
    void deliveryFailureDoesNotRecordDuplicateAndRetryCanSend() {
        double failureBefore = attempts("order_paid_admin", "failure");
        double sentBefore = attempts("order_paid_admin", "sent");
        Store store = storeRepository.save(new Store(UUID.randomUUID(), "notify-retry", "Notify Retry"));
        storeMemberRepository.save(new StoreMember(
                UUID.randomUUID(),
                store.getId(),
                "retry-admin@example.com",
                StoreMemberRole.ADMIN,
                StoreMemberStatus.ACTIVE
        ));
        StoreOrder order = createPaidOrderWithoutBuyer(store, "SKU7", "Americano", new BigDecimal("10.00"));
        OutboxEvent paidEvent = savePaidEvent(order.getId());

        emailSender.failNextSend();
        assertThatThrownBy(() -> storeOrderNotificationService.handle(paidEvent))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("forced_email_failure");
        assertThat(emailSender.messages()).isEmpty();
        assertThat(attempts("order_paid_admin", "failure") - failureBefore).isEqualTo(1.0);

        storeOrderNotificationService.handle(paidEvent);

        assertThat(emailSender.messages()).hasSize(1);
        assertThat(emailSender.messages().get(0).to()).isEqualTo("retry-admin@example.com");
        assertThat(attempts("order_paid_admin", "sent") - sentBefore).isEqualTo(1.0);
        storeOrderNotificationService.handle(paidEvent);
        assertThat(emailSender.messages()).hasSize(1);
    }

    @Test
    void notificationEmailMetricsUseOnlyLowCardinalityLabels() {
        Store store = storeRepository.save(new Store(UUID.randomUUID(), "notify-labels", "Notify Labels"));
        storeMemberRepository.save(new StoreMember(
                UUID.randomUUID(),
                store.getId(),
                "labels-admin@example.com",
                StoreMemberRole.ADMIN,
                StoreMemberStatus.ACTIVE
        ));
        StoreOrder order = createPaidOrderWithoutBuyer(store, "SKU8", "Macchiato", new BigDecimal("8.00"));
        storeOrderNotificationService.handle(savePaidEvent(order.getId()));

        for (Meter meter : meterRegistry.getMeters()) {
            String name = meter.getId().getName();
            if ("barmi_notification_email_attempts_total".equals(name)) {
                assertThat(meter.getId().getTags().stream().map(tag -> tag.getKey()).toList())
                        .containsExactlyInAnyOrder("template", "result", "mode");
            }
            if ("barmi_notification_email_latency_seconds".equals(name)) {
                assertThat(meter.getId().getTags().stream().map(tag -> tag.getKey()).toList())
                        .containsExactlyInAnyOrder("template", "mode");
            }
        }
    }

    @TestConfiguration
    static class NotificationTestConfig {
        @Bean
        @Primary
        InMemoryNotificationEmailSender inMemoryNotificationEmailSender() {
            return new InMemoryNotificationEmailSender();
        }
    }

    static class InMemoryNotificationEmailSender implements NotificationEmailSender {
        private final List<EmailMessage> messages = new ArrayList<>();
        private boolean failNextSend;

        @Override
        public void send(EmailMessage message) {
            if (failNextSend) {
                failNextSend = false;
                throw new RuntimeException("forced_email_failure");
            }
            messages.add(message);
        }

        List<EmailMessage> messages() {
            return messages;
        }

        void clear() {
            messages.clear();
            failNextSend = false;
        }

        void failNextSend() {
            failNextSend = true;
        }
    }

    private StoreOrder createPaidOrderWithoutBuyer(Store store, String sku, String productName, BigDecimal total) {
        Product product = productRepository.save(new Product(UUID.randomUUID(), store.getId(), sku, productName, total.movePointRight(2).longValueExact(), 10));
        UUID orderId = UUID.randomUUID();
        StoreOrder order = StoreOrder.create(
                orderId,
                store.getId(),
                "ARS",
                total,
                total,
                BigDecimal.ZERO,
                "",
                null,
                null,
                List.of(new StoreOrderItem(
                        UUID.randomUUID(),
                        orderId,
                        product.getId(),
                        1,
                        total,
                        total,
                        "ARS",
                        "{}"
                ))
        );
        order.markPaid();
        return storeOrderRepository.save(order);
    }

    private OutboxEvent savePaidEvent(UUID orderId) {
        return outboxEventRepository.save(new OutboxEvent(
                UUID.randomUUID(),
                "STORE_ORDER_PAID",
                "STORE",
                orderId,
                "{}"
        ));
    }

    private double attempts(String template, String result) {
        var counter = meterRegistry.find("barmi_notification_email_attempts_total")
                .tags("template", template, "result", result, "mode", "logging")
                .counter();
        return counter == null ? 0.0 : counter.count();
    }

    private long latencyCount(String template) {
        var timer = meterRegistry.find("barmi_notification_email_latency_seconds")
                .tags("template", template, "mode", "logging")
                .timer();
        return timer == null ? 0L : timer.count();
    }

    private void dispatchStoreNotifications() {
        outboxEventRepository.findAll().stream()
                .filter(event -> event.getPublishedAt() == null)
                .filter(event -> OutboxEvent.STATUS_PENDING.equals(event.getStatus()))
                .forEach(event -> {
                    if (!"STORE".equals(event.getScope())) {
                        return;
                    }
                    storeOrderNotificationService.handle(event);
                    event.markPublishedNow();
                    outboxEventRepository.save(event);
                });
    }
}
