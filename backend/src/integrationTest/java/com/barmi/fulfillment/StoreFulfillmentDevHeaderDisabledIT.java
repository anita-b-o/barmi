package com.barmi.fulfillment;

import com.barmi.domain.catalog.Product;
import com.barmi.domain.enums.PaymentScope;
import com.barmi.domain.store.Store;
import com.barmi.infra.repo.ProductRepository;
import com.barmi.infra.repo.StoreRepository;
import com.barmi.testsupport.ApiTestClient;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.TestConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.springframework.test.web.servlet.MockMvc;

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
        "app.security.allowDevIdentityHeader=false"
})
@org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
@TestConstructor(autowireMode = TestConstructor.AutowireMode.ALL)
@ActiveProfiles("integrationtest")
@AutoConfigureTestDatabase(replace = NONE)
class StoreFulfillmentDevHeaderDisabledIT {

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
    private final ApiTestClient api;

@Autowired
    StoreFulfillmentDevHeaderDisabledIT(
            StoreRepository storeRepository,
            ProductRepository productRepository,
            MockMvc mockMvc
    ) {
        this.storeRepository = storeRepository;
        this.productRepository = productRepository;
        this.api = new ApiTestClient(mockMvc);
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
                )
        );
        ApiTestClient.ApiTestResponse checkoutResp = api.postJson(
                "/api/store/checkout",
                checkoutBody,
                storeHeaders
        );
        assertThat(new java.math.BigDecimal(checkoutResp.body().get("shippingCostAmount").toString()))
                .isEqualTo(java.math.BigDecimal.ZERO);
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
        api.postJson(
                "/api/webhooks/mercadopago",
                webhookPayload,
                webhookHeaders
        );

        ApiTestClient.ApiTestResponse createResp = api.postJson(
                "/api/store/orders/" + orderId + "/fulfillment",
                Map.of(),
                storeHeaders
        );
        assertThat(createResp.status()).isEqualTo(401);
        Map<String, Object> error = (Map<String, Object>) createResp.body().get("error");
        assertThat(error.get("code")).isEqualTo("unauthorized");
    }
}
