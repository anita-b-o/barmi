package com.barmi.fulfillment;

import com.barmi.PostgresIntegrationTestBase;
import com.barmi.domain.catalog.Product;
import com.barmi.domain.enums.PaymentScope;
import com.barmi.domain.orders.StoreOrderStatus;
import com.barmi.domain.store.Store;
import com.barmi.domain.store.StoreMember;
import com.barmi.domain.store.StoreMemberRole;
import com.barmi.domain.store.StoreMemberStatus;
import com.barmi.domain.users.User;
import com.barmi.domain.users.UserStatus;
import com.barmi.infra.repo.ProductRepository;
import com.barmi.infra.repo.RefreshTokenRepository;
import com.barmi.infra.repo.StoreFulfillmentRepository;
import com.barmi.infra.repo.StoreMemberRepository;
import com.barmi.infra.repo.StoreOrderRepository;
import com.barmi.infra.repo.StoreRepository;
import com.barmi.infra.repo.UserRepository;
import com.barmi.testsupport.ApiTestClient;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.TestConstructor;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@Testcontainers
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "jwt.secret=this_is_a_super_long_test_secret_key_that_is_at_least_32_bytes_long",
        "app.money.defaultCurrency=ARS",
        "app.mercadoPago.webhookSecret=secret",
        "app.security.allowDevIdentityHeader=true"
})
@AutoConfigureMockMvc
@TestConstructor(autowireMode = TestConstructor.AutowireMode.ALL)
class StoreFulfillmentAuthorizationIT extends PostgresIntegrationTestBase {

    private final StoreRepository storeRepository;
    private final ProductRepository productRepository;
    private final StoreOrderRepository storeOrderRepository;
    private final StoreMemberRepository storeMemberRepository;
    private final StoreFulfillmentRepository storeFulfillmentRepository;
    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final MockMvc mockMvc;
    private final ApiTestClient api;
    private final JdbcTemplate jdbcTemplate;

    @Autowired
    StoreFulfillmentAuthorizationIT(
            StoreRepository storeRepository,
            ProductRepository productRepository,
            StoreOrderRepository storeOrderRepository,
            StoreMemberRepository storeMemberRepository,
            StoreFulfillmentRepository storeFulfillmentRepository,
            UserRepository userRepository,
            RefreshTokenRepository refreshTokenRepository,
            PasswordEncoder passwordEncoder,
            MockMvc mockMvc,
            JdbcTemplate jdbcTemplate
    ) {
        this.storeRepository = storeRepository;
        this.productRepository = productRepository;
        this.storeOrderRepository = storeOrderRepository;
        this.storeMemberRepository = storeMemberRepository;
        this.storeFulfillmentRepository = storeFulfillmentRepository;
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.mockMvc = mockMvc;
        this.api = new ApiTestClient(mockMvc);
        this.jdbcTemplate = jdbcTemplate;
    }

    @BeforeEach
    void setup() {
        truncateAllTables(jdbcTemplate);
    }

    @Test
    void fulfillmentAuthorizationScenarios() throws Exception {
        String slug = "auth-" + UUID.randomUUID();
        Store store = storeRepository.save(new Store(UUID.randomUUID(), slug, "Auth"));
        Product p1 = productRepository.save(new Product(UUID.randomUUID(), store.getId(), "SKU1", "Latte", 500));

        String staffEmail = "staff-" + UUID.randomUUID() + "@auth.test";
        String adminEmail = "admin-" + UUID.randomUUID() + "@auth.test";
        String staff2Email = "staff2-" + UUID.randomUUID() + "@auth.test";
        userRepository.save(new User(UUID.randomUUID(), staffEmail, passwordEncoder.encode("secret"), UserStatus.ACTIVE));
        userRepository.save(new User(UUID.randomUUID(), adminEmail, passwordEncoder.encode("secret"), UserStatus.ACTIVE));
        userRepository.save(new User(UUID.randomUUID(), staff2Email, passwordEncoder.encode("secret"), UserStatus.ACTIVE));

        storeMemberRepository.save(new StoreMember(UUID.randomUUID(), store.getId(), staffEmail, StoreMemberRole.STAFF, StoreMemberStatus.ACTIVE));
        storeMemberRepository.save(new StoreMember(UUID.randomUUID(), store.getId(), adminEmail, StoreMemberRole.ADMIN, StoreMemberStatus.ACTIVE));
        storeMemberRepository.save(new StoreMember(UUID.randomUUID(), store.getId(), staff2Email, StoreMemberRole.STAFF, StoreMemberStatus.ACTIVE));

        HttpHeaders storeHeaders = api.storeHostHeaders(slug);

        Map<String, Object> checkoutBody = Map.of(
                "items", List.of(
                        Map.of("productId", p1.getId().toString(), "qty", 1)
                ),
                "buyerEmail", "buyer-" + UUID.randomUUID() + "@example.com"
        );
        ApiTestClient.ApiTestResponse checkoutResp = api.postJson("/api/store/checkout", checkoutBody, storeHeaders);
        assertThat(checkoutResp.status()).isEqualTo(201);
        assertThat(new BigDecimal(checkoutResp.body().get("shippingCostAmount").toString())).isEqualTo(BigDecimal.ZERO);
        String orderId = checkoutResp.body().get("orderId").toString();
        BigDecimal totalAmount = new BigDecimal(checkoutResp.body().get("totalAmount").toString());

        Map<String, Object> webhookPayload = Map.of(
                "event_id", UUID.randomUUID().toString(),
                "scope", PaymentScope.STORE.name(),
                "operation_id", orderId,
                "provider_payment_id", "mp_auth_1",
                "status", "approved",
                "amount", totalAmount,
                "currency", "ARS"
        );
        HttpHeaders webhookHeaders = api.withWebhookSecret(new HttpHeaders(), "secret");
        api.postJson("/api/webhooks/mercadopago", webhookPayload, webhookHeaders);
        assertThat(storeOrderRepository.findById(UUID.fromString(orderId)).orElseThrow().getStatus()).isEqualTo(StoreOrderStatus.PAID);

        HttpHeaders noAuthHeaders = api.storeHostHeaders(slug);
        ApiTestClient.ApiTestResponse forbiddenResp = api.postJson("/api/store/orders/" + orderId + "/fulfillment", Map.of(), noAuthHeaders);
        assertThat(forbiddenResp.status()).isEqualTo(401);
        assertThat(((Map<String, Object>) forbiddenResp.body().get("error")).get("code")).isEqualTo("unauthorized");

        String staffToken = loginAndGetAccessToken(staffEmail);
        HttpHeaders staffHeaders = api.storeHostHeaders(slug);
        staffHeaders.setBearerAuth(staffToken);
        ApiTestClient.ApiTestResponse insufficientResp = api.postJson("/api/store/orders/" + orderId + "/fulfillment", Map.of(), staffHeaders);
        assertThat(insufficientResp.status()).isEqualTo(403);
        assertThat(((Map<String, Object>) insufficientResp.body().get("error")).get("code")).isEqualTo("forbidden");

        var existing = storeFulfillmentRepository.findByStoreOrderId(UUID.fromString(orderId)).orElseThrow();

        String adminToken = loginAndGetAccessToken(adminEmail);
        HttpHeaders adminHeaders = api.storeHostHeaders(slug);
        adminHeaders.setBearerAuth(adminToken);
        ApiTestClient.ApiTestResponse okResp = api.postJson("/api/store/orders/" + orderId + "/fulfillment", Map.of(), adminHeaders);
        assertThat(okResp.status()).isEqualTo(409);

        String fulfillmentId = existing.getId().toString();

        mockMvc.perform(patch("/api/store/fulfillments/" + fulfillmentId + "/status")
                        .headers(noAuthHeaders)
                        .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"DISPATCHED\"}"))
                .andExpect(status().isUnauthorized());

        String staff2Token = loginAndGetAccessToken(staff2Email);
        HttpHeaders staff2Headers = api.storeHostHeaders(slug);
        staff2Headers.setBearerAuth(staff2Token);

        mockMvc.perform(patch("/api/store/fulfillments/" + fulfillmentId + "/status")
                        .headers(staff2Headers)
                        .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"DISPATCHED\"}"))
                .andExpect(status().isOk());
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
