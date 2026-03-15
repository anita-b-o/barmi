package com.barmi.fulfillment;

import com.barmi.domain.catalog.Product;
import com.barmi.domain.enums.PaymentScope;
import com.barmi.domain.orders.StoreOrderStatus;
import com.barmi.domain.store.Store;
import com.barmi.domain.store.StoreMember;
import com.barmi.domain.store.StoreMemberRole;
import com.barmi.domain.store.StoreMemberStatus;
import com.barmi.domain.users.User;
import com.barmi.domain.users.UserStatus;
import com.barmi.infra.repo.OutboxEventRepository;
import com.barmi.infra.repo.ProductRepository;
import com.barmi.infra.repo.RefreshTokenRepository;
import com.barmi.infra.repo.StoreMemberRepository;
import com.barmi.infra.repo.StoreFulfillmentRepository;
import com.barmi.infra.repo.StoreOrderRepository;
import com.barmi.infra.repo.StoreRepository;
import com.barmi.infra.repo.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.TestConstructor;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

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
class StoreFulfillmentFlowIT {

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
    private final OutboxEventRepository outboxEventRepository;
    private final StoreMemberRepository storeMemberRepository;
    private final StoreFulfillmentRepository storeFulfillmentRepository;
    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final MockMvc mockMvc;
    private final ApiTestClient api;

    @Autowired
    StoreFulfillmentFlowIT(
            StoreRepository storeRepository,
            ProductRepository productRepository,
            StoreOrderRepository storeOrderRepository,
            OutboxEventRepository outboxEventRepository,
            StoreMemberRepository storeMemberRepository,
            StoreFulfillmentRepository storeFulfillmentRepository,
            UserRepository userRepository,
            RefreshTokenRepository refreshTokenRepository,
            PasswordEncoder passwordEncoder,
            MockMvc mockMvc
    ) {
        this.storeRepository = storeRepository;
        this.productRepository = productRepository;
        this.storeOrderRepository = storeOrderRepository;
        this.outboxEventRepository = outboxEventRepository;
        this.storeMemberRepository = storeMemberRepository;
        this.storeFulfillmentRepository = storeFulfillmentRepository;
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.mockMvc = mockMvc;
        this.api = new ApiTestClient(mockMvc);
    }

    @Test
    void fulfillmentFlowHappyPathAndInvalidTransition() throws Exception {
        String slug = "cafe-" + UUID.randomUUID();
        Store store = storeRepository.save(new Store(UUID.randomUUID(), slug, "Cafe"));
        Product p1 = productRepository.save(new Product(UUID.randomUUID(), store.getId(), "SKU1", "Latte", 500));

        refreshTokenRepository.deleteAll();
        userRepository.deleteAll();
        storeMemberRepository.deleteAll();

        String adminEmail = "admin-" + UUID.randomUUID() + "@cafe.test";
        userRepository.save(new User(UUID.randomUUID(), adminEmail, passwordEncoder.encode("secret"), UserStatus.ACTIVE));
        storeMemberRepository.save(new StoreMember(UUID.randomUUID(), store.getId(), adminEmail, StoreMemberRole.ADMIN, StoreMemberStatus.ACTIVE));

        String token = loginAndGetAccessToken(adminEmail);
        HttpHeaders storeHeaders = api.storeHostHeaders(slug);
        storeHeaders.setBearerAuth(token);

        Map<String, Object> checkoutBody = Map.of(
                "items", List.of(
                        Map.of("productId", p1.getId().toString(), "qty", 1)
                )
        );
        ApiTestClient.ApiTestResponse checkoutResp = api.postJson(
                "/api/store/checkout",
                checkoutBody,
                storeHeaders
        );
        assertThat(checkoutResp.status()).isEqualTo(201);
        assertThat(new java.math.BigDecimal(checkoutResp.body().get("shippingCostAmount").toString()))
                .isEqualTo(java.math.BigDecimal.ZERO);
        String orderId = checkoutResp.body().get("orderId").toString();
        BigDecimal totalAmount = new BigDecimal(checkoutResp.body().get("totalAmount").toString());

        Map<String, Object> webhookPayload = Map.of(
                "event_id", UUID.randomUUID().toString(),
                "scope", PaymentScope.STORE.name(),
                "operation_id", orderId,
                "provider_payment_id", "mp_pay_1",
                "status", "approved",
                "amount", totalAmount,
                "currency", "ARS"
        );
        HttpHeaders webhookHeaders = api.withWebhookSecret(new HttpHeaders(), "secret");
        ApiTestClient.ApiTestResponse webhookResp = api.postJson(
                "/api/webhooks/mercadopago",
                webhookPayload,
                webhookHeaders
        );
        assertThat(webhookResp.status()).isEqualTo(200);

        assertThat(storeOrderRepository.findById(UUID.fromString(orderId)).orElseThrow().getStatus())
                .isEqualTo(StoreOrderStatus.PAID);

        var existing = storeFulfillmentRepository.findByStoreOrderId(UUID.fromString(orderId)).orElseThrow();
        String fulfillmentId = existing.getId().toString();

        assertThat(outboxEventRepository.findByAggregateIdAndEventType(UUID.fromString(fulfillmentId), "STORE_FULFILLMENT_CREATED"))
                .hasSize(1);

        mockMvc.perform(patch("/api/store/fulfillments/" + fulfillmentId + "/status")
                        .headers(storeHeaders)
                        .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"DISPATCHED\"}"))
                .andExpect(status().isOk());

        mockMvc.perform(patch("/api/store/fulfillments/" + fulfillmentId + "/status")
                        .headers(storeHeaders)
                        .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"DELIVERED\"}"))
                .andExpect(status().isOk());

        assertThat(outboxEventRepository.findByAggregateIdAndEventType(UUID.fromString(fulfillmentId), "STORE_FULFILLMENT_STATUS_CHANGED"))
                .hasSize(2);

        mockMvc.perform(patch("/api/store/fulfillments/" + fulfillmentId + "/status")
                        .headers(storeHeaders)
                        .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"DISPATCHED\"}"))
                .andExpect(status().isConflict());
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
}
