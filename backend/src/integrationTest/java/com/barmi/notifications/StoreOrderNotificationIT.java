package com.barmi.notifications;

import com.barmi.app.fulfillment.UpdateFulfillmentStatusService;
import com.barmi.app.notifications.NotificationEmailSender;
import com.barmi.app.notifications.StoreOrderNotificationService;
import com.barmi.domain.catalog.Product;
import com.barmi.domain.fulfillment.FulfillmentStatus;
import com.barmi.domain.store.Store;
import com.barmi.infra.repo.OutboxEventRepository;
import com.barmi.infra.repo.ProductRepository;
import com.barmi.infra.repo.StoreFulfillmentRepository;
import com.barmi.infra.repo.StoreRepository;
import com.barmi.testsupport.ApiTestClient;
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
    private final OutboxEventRepository outboxEventRepository;
    private final StoreOrderNotificationService storeOrderNotificationService;
    private final UpdateFulfillmentStatusService updateFulfillmentStatusService;
    private final InMemoryNotificationEmailSender emailSender;
    private final ApiTestClient api;

    @Autowired
    StoreOrderNotificationIT(
            StoreRepository storeRepository,
            ProductRepository productRepository,
            StoreFulfillmentRepository storeFulfillmentRepository,
            OutboxEventRepository outboxEventRepository,
            StoreOrderNotificationService storeOrderNotificationService,
            UpdateFulfillmentStatusService updateFulfillmentStatusService,
            InMemoryNotificationEmailSender emailSender,
            MockMvc mockMvc
    ) {
        this.storeRepository = storeRepository;
        this.productRepository = productRepository;
        this.storeFulfillmentRepository = storeFulfillmentRepository;
        this.outboxEventRepository = outboxEventRepository;
        this.storeOrderNotificationService = storeOrderNotificationService;
        this.updateFulfillmentStatusService = updateFulfillmentStatusService;
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
        Store store = storeRepository.save(new Store(UUID.randomUUID(), "notify-paid", "Notify Paid"));
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

        assertThat(emailSender.messages()).hasSize(2);
        assertThat(emailSender.messages().stream().map(NotificationEmailSender.EmailMessage::subject).toList())
                .anyMatch(subject -> subject.contains("Pago confirmado"))
                .anyMatch(subject -> subject.contains("Empezamos a preparar"));

        dispatchStoreNotifications();
        assertThat(emailSender.messages()).hasSize(2);
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

        @Override
        public void send(EmailMessage message) {
            messages.add(message);
        }

        List<EmailMessage> messages() {
            return messages;
        }

        void clear() {
            messages.clear();
        }
    }

    private void dispatchStoreNotifications() {
        outboxEventRepository.findUnpublished().forEach(event -> {
            if (!"STORE".equals(event.getScope())) {
                return;
            }
            storeOrderNotificationService.handle(event);
            event.markPublishedNow();
            outboxEventRepository.save(event);
        });
    }
}
