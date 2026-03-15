package com.barmi.ecosystem;

import com.barmi.app.ecosystem.EcosystemCheckoutService;
import com.barmi.app.ecosystem.EcosystemCheckoutService.CheckoutItem;
import com.barmi.app.payments.EcosystemPaymentConfirmationService;
import com.barmi.domain.ecosystem.Ecosystem;
import com.barmi.domain.ecosystem.EcosystemExternalProduct;
import com.barmi.domain.orders.EcosystemOrder;
import com.barmi.domain.orders.EcosystemOrderStatus;
import com.barmi.infra.repo.EcosystemExternalProductRepository;
import com.barmi.infra.repo.EcosystemOrderRepository;
import com.barmi.infra.repo.EcosystemRepository;
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
class EcosystemOrderQueryIT {

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

    private final EcosystemRepository ecosystemRepository;
    private final EcosystemExternalProductRepository ecosystemExternalProductRepository;
    private final EcosystemOrderRepository ecosystemOrderRepository;
    private final EcosystemCheckoutService ecosystemCheckoutService;
    private final EcosystemPaymentConfirmationService ecosystemPaymentConfirmationService;
    private final ApiTestClient api;

    @Autowired
    EcosystemOrderQueryIT(
            EcosystemRepository ecosystemRepository,
            EcosystemExternalProductRepository ecosystemExternalProductRepository,
            EcosystemOrderRepository ecosystemOrderRepository,
            EcosystemCheckoutService ecosystemCheckoutService,
            EcosystemPaymentConfirmationService ecosystemPaymentConfirmationService,
            MockMvc mockMvc
    ) {
        this.ecosystemRepository = ecosystemRepository;
        this.ecosystemExternalProductRepository = ecosystemExternalProductRepository;
        this.ecosystemOrderRepository = ecosystemOrderRepository;
        this.ecosystemCheckoutService = ecosystemCheckoutService;
        this.ecosystemPaymentConfirmationService = ecosystemPaymentConfirmationService;
        this.api = new ApiTestClient(mockMvc);
    }

    @Test
    void getByIdReturnsOrderViewWithItemsAndShipping() throws Exception {
        Ecosystem ecosystem = ecosystemRepository.save(new Ecosystem(UUID.randomUUID(), "Eco", "eco"));
        EcosystemExternalProduct product = ecosystemExternalProductRepository.save(
                new EcosystemExternalProduct(UUID.randomUUID(), ecosystem, "Coffee", new BigDecimal("10.00"), "ARS", true)
        );

        EcosystemOrder order = ecosystemCheckoutService.checkout(
                ecosystem.getId(),
                List.of(new CheckoutItem(product.getId(), 2)),
                null
        );

        ApiTestClient.ApiTestResponse response = api.get(
                "/api/ecosystem/orders/" + order.getId(),
                null
        );
        assertThat(response.status()).isEqualTo(200);
        Map<String, Object> body = response.body();
        assertThat(body.get("orderId").toString()).isEqualTo(order.getId().toString());
        assertThat(body.get("status")).isEqualTo(EcosystemOrderStatus.PENDING_PAYMENT.name());

        assertThat(body.get("shipping")).isNull();

        List<Map<String, Object>> items = (List<Map<String, Object>>) body.get("items");
        assertThat(items).hasSize(1);
        Map<String, Object> item = items.get(0);
        assertThat(item.get("productId").toString()).isEqualTo(product.getId().toString());
        assertThat(item.get("name")).isEqualTo("Coffee");
        assertThat(Integer.parseInt(item.get("qty").toString())).isEqualTo(2);
        assertThat(new BigDecimal(item.get("unitPriceAmount").toString())).isEqualByComparingTo("10.00");
        assertThat(new BigDecimal(item.get("lineTotalAmount").toString())).isEqualByComparingTo("20.00");
        assertThat(item.get("currency")).isEqualTo("ARS");

        assertThat(body).containsKey("payment");
        assertThat(body.get("payment")).isNull();
    }

    @Test
    void getByIdMissingReturns404() throws Exception {
        ApiTestClient.ApiTestResponse response = api.get(
                "/api/ecosystem/orders/" + UUID.randomUUID(),
                null
        );
        assertThat(response.status()).isEqualTo(404);
        Map<String, Object> error = (Map<String, Object>) response.body().get("error");
        assertThat(error.get("code")).isEqualTo("ecosystem_order_not_found");
    }

    @Test
    void listPaginatesAndFiltersByStatus() throws Exception {
        Ecosystem ecosystem = ecosystemRepository.save(new Ecosystem(UUID.randomUUID(), "Eco2", "eco2"));
        EcosystemExternalProduct product = ecosystemExternalProductRepository.save(
                new EcosystemExternalProduct(UUID.randomUUID(), ecosystem, "Tea", new BigDecimal("5.00"), "ARS", true)
        );

        ecosystemCheckoutService.checkout(
                ecosystem.getId(),
                List.of(new CheckoutItem(product.getId(), 1)),
                null
        );

        EcosystemOrder paid = ecosystemCheckoutService.checkout(
                ecosystem.getId(),
                List.of(new CheckoutItem(product.getId(), 1)),
                null
        );
        ecosystemPaymentConfirmationService.confirmEcosystemPayment(
                UUID.randomUUID(),
                paid.getId(),
                "mp_paid_1",
                paid.getTotalAmount(),
                paid.getCurrency()
        );

        EcosystemOrder cancelled = ecosystemCheckoutService.checkout(
                ecosystem.getId(),
                List.of(new CheckoutItem(product.getId(), 1)),
                null
        );
        EcosystemOrder reloaded = ecosystemOrderRepository.findById(cancelled.getId()).orElseThrow();
        reloaded.cancel();
        ecosystemOrderRepository.save(reloaded);

        ApiTestClient.ApiTestResponse paged = api.get(
                "/api/ecosystem/orders?page=0&size=2",
                null
        );
        assertThat(paged.status()).isEqualTo(200);
        Map<String, Object> pagedBody = paged.body();
        assertThat(Integer.parseInt(pagedBody.get("size").toString())).isEqualTo(2);
        assertThat(Long.parseLong(pagedBody.get("totalElements").toString())).isEqualTo(3L);
        List<Map<String, Object>> content = (List<Map<String, Object>>) pagedBody.get("content");
        assertThat(content.size()).isEqualTo(2);

        ApiTestClient.ApiTestResponse filtered = api.get(
                "/api/ecosystem/orders?status=PAID",
                null
        );
        assertThat(filtered.status()).isEqualTo(200);
        Map<String, Object> filteredBody = filtered.body();
        List<Map<String, Object>> filteredContent = (List<Map<String, Object>>) filteredBody.get("content");
        assertThat(filteredContent).hasSize(1);
        assertThat(filteredContent.get(0).get("status")).isEqualTo("PAID");
        assertThat(filteredContent.get(0).get("orderId").toString()).isEqualTo(paid.getId().toString());
    }
}
