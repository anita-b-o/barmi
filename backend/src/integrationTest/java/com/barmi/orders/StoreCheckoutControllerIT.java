package com.barmi.orders;

import com.barmi.domain.catalog.Product;
import com.barmi.domain.store.Store;
import com.barmi.infra.repo.OutboxEventRepository;
import com.barmi.infra.repo.ProductRepository;
import com.barmi.infra.repo.StoreOrderRepository;
import com.barmi.infra.repo.StoreRepository;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.TestConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.List;
import java.util.Map;
import java.util.UUID;


import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase.Replace.NONE;

@Testcontainers
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "jwt.secret=this_is_a_super_long_test_secret_key_that_is_at_least_32_bytes_long",
        "app.money.defaultCurrency=ARS"
})
@TestConstructor(autowireMode = TestConstructor.AutowireMode.ALL)
@ActiveProfiles("integrationtest")
@AutoConfigureTestDatabase(replace = NONE)
class StoreCheckoutControllerIT {

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

    private final TestRestTemplate restTemplate;
    private final StoreRepository storeRepository;
    private final ProductRepository productRepository;
    private final StoreOrderRepository storeOrderRepository;
    private final OutboxEventRepository outboxEventRepository;

    @LocalServerPort
    private int port;

@Autowired
    StoreCheckoutControllerIT(
            TestRestTemplate restTemplate,
            StoreRepository storeRepository,
            ProductRepository productRepository,
            StoreOrderRepository storeOrderRepository,
            OutboxEventRepository outboxEventRepository
    ) {
        this.restTemplate = restTemplate;
        this.storeRepository = storeRepository;
        this.productRepository = productRepository;
        this.storeOrderRepository = storeOrderRepository;
        this.outboxEventRepository = outboxEventRepository;
    }

    @Test
    void checkoutCreatesOrderAndOutbox() {
        Store store = storeRepository.save(new Store(UUID.randomUUID(), "cafe", "Cafe"));
        Product p1 = productRepository.save(new Product(UUID.randomUUID(), store.getId(), "SKU1", "Latte", 500));
        Product p2 = productRepository.save(new Product(UUID.randomUUID(), store.getId(), "SKU2", "Mocha", 700));

        Map<String, Object> body = Map.of(
                "items", List.of(
                        Map.of("productId", p1.getId().toString(), "qty", 2),
                        Map.of("productId", p2.getId().toString(), "qty", 1)
                )
        );

        HttpHeaders headers = new HttpHeaders();
        headers.set("Host", "cafe.example.com");
        headers.set("X-Forwarded-Host", "cafe.example.com");
        HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);

        ResponseEntity<Map> response = restTemplate.exchange(
                "http://localhost:" + port + "/api/store/checkout",
                HttpMethod.POST,
                request,
                Map.class
        );

        assertThat(response.getStatusCode().value()).isEqualTo(201);
        assertThat(response.getBody()).containsKeys("orderId", "subtotalAmount", "totalAmount");
        assertThat(response.getBody().get("currency")).isEqualTo("ARS");
        assertThat(response.getBody().get("shippingCostAmount").toString()).isEqualTo("0");

        String orderId = response.getBody().get("orderId").toString();
        assertThat(storeOrderRepository.findById(UUID.fromString(orderId))).isPresent();
        assertThat(outboxEventRepository.findByAggregateIdAndEventType(UUID.fromString(orderId), "STORE_ORDER_CREATED"))
                .hasSize(1);
    }

    @Test
    void checkoutWithMissingProductReturnsNotFound() {
        Store store = storeRepository.save(new Store(UUID.randomUUID(), "cafe2", "Cafe2"));
        productRepository.save(new Product(UUID.randomUUID(), store.getId(), "SKU9", "Cortado", 400));

        Map<String, Object> body = Map.of(
                "items", List.of(
                        Map.of("productId", UUID.randomUUID().toString(), "qty", 1)
                )
        );

        HttpHeaders headers = new HttpHeaders();
        headers.set("Host", "cafe2.example.com");
        headers.set("X-Forwarded-Host", "cafe2.example.com");
        HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);

        ResponseEntity<Map> response = restTemplate.exchange(
                "http://localhost:" + port + "/api/store/checkout",
                HttpMethod.POST,
                request,
                Map.class
        );

        assertThat(response.getStatusCode().value()).isEqualTo(404);
        assertThat(response.getBody()).containsKey("error");
        Map<String, Object> error = (Map<String, Object>) response.getBody().get("error");
        assertThat(error.get("code")).isEqualTo("product_not_found");
        assertThat(error.get("status")).isEqualTo(404);
    }
}
