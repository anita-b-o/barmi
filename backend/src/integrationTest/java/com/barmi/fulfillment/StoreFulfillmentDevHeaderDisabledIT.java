package com.barmi.fulfillment;

import com.barmi.PostgresIntegrationTestBase;
import com.barmi.domain.catalog.Product;
import com.barmi.domain.enums.PaymentScope;
import com.barmi.domain.store.Store;
import com.barmi.infra.repo.ProductRepository;
import com.barmi.infra.repo.StoreRepository;
import com.barmi.testsupport.ApiTestClient;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.TestConstructor;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@Testcontainers
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "jwt.secret=this_is_a_super_long_test_secret_key_that_is_at_least_32_bytes_long",
        "app.money.defaultCurrency=ARS",
        "app.mercadoPago.webhookSecret=secret",
        "app.security.allowDevIdentityHeader=false"
})
@AutoConfigureMockMvc
@TestConstructor(autowireMode = TestConstructor.AutowireMode.ALL)
class StoreFulfillmentDevHeaderDisabledIT extends PostgresIntegrationTestBase {

    private final StoreRepository storeRepository;
    private final ProductRepository productRepository;
    private final ApiTestClient api;
    private final JdbcTemplate jdbcTemplate;

    @Autowired
    StoreFulfillmentDevHeaderDisabledIT(
            StoreRepository storeRepository,
            ProductRepository productRepository,
            MockMvc mockMvc,
            JdbcTemplate jdbcTemplate
    ) {
        this.storeRepository = storeRepository;
        this.productRepository = productRepository;
        this.api = new ApiTestClient(mockMvc);
        this.jdbcTemplate = jdbcTemplate;
    }

    @BeforeEach
    void setup() {
        truncateAllTables(jdbcTemplate);
    }

    @Test
    void devHeaderIsRejectedWhenDisabled() throws Exception {
        Store store = storeRepository.save(new Store(UUID.randomUUID(), "dev", "Dev"));
        Product p1 = productRepository.save(new Product(UUID.randomUUID(), store.getId(), "SKU1", "Latte", 500));

        HttpHeaders storeHeaders = new HttpHeaders();
        storeHeaders.set("Host", "dev.example.com");
        storeHeaders.set("X-Forwarded-Host", "dev.example.com");
        storeHeaders.set("X-User-Email", "admin@dev.test");

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
                "provider_payment_id", "mp_dev_1",
                "status", "approved",
                "amount", totalAmount,
                "currency", "ARS"
        );
        HttpHeaders webhookHeaders = api.withWebhookSecret(new HttpHeaders(), "secret");
        api.postJson("/api/webhooks/mercadopago", webhookPayload, webhookHeaders);

        ApiTestClient.ApiTestResponse createResp = api.postJson("/api/store/orders/" + orderId + "/fulfillment", Map.of(), storeHeaders);
        assertThat(createResp.status()).isEqualTo(401);
        assertThat(((Map<String, Object>) createResp.body().get("error")).get("code")).isEqualTo("unauthorized");
    }
}
