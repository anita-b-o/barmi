package com.barmi.orders;

import com.barmi.PostgresIntegrationTestBase;
import com.barmi.domain.catalog.Product;
import com.barmi.domain.shipping.ShippingZoneType;
import com.barmi.domain.shipping.StoreShippingZone;
import com.barmi.domain.store.Store;
import com.barmi.infra.repo.OutboxEventRepository;
import com.barmi.infra.repo.ProductRepository;
import com.barmi.infra.repo.StoreOrderRepository;
import com.barmi.infra.repo.StoreRepository;
import com.barmi.infra.repo.StoreShippingZoneRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.context.TestConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import com.barmi.testsupport.ApiTestClient;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;


import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "jwt.secret=this_is_a_super_long_test_secret_key_that_is_at_least_32_bytes_long",
        "app.money.defaultCurrency=ARS"
})
@org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
@TestConstructor(autowireMode = TestConstructor.AutowireMode.ALL)
class CheckoutWithShippingIT extends PostgresIntegrationTestBase {

    private final StoreRepository storeRepository;
    private final ProductRepository productRepository;
    private final StoreShippingZoneRepository storeShippingZoneRepository;
    private final StoreOrderRepository storeOrderRepository;
    private final OutboxEventRepository outboxEventRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final ApiTestClient api;
    private final JdbcTemplate jdbcTemplate;

    @Autowired
    CheckoutWithShippingIT(
            StoreRepository storeRepository,
            ProductRepository productRepository,
            StoreShippingZoneRepository storeShippingZoneRepository,
            StoreOrderRepository storeOrderRepository,
            OutboxEventRepository outboxEventRepository,
            MockMvc mockMvc,
            JdbcTemplate jdbcTemplate
    ) {
        this.storeRepository = storeRepository;
        this.productRepository = productRepository;
        this.storeShippingZoneRepository = storeShippingZoneRepository;
        this.storeOrderRepository = storeOrderRepository;
        this.outboxEventRepository = outboxEventRepository;
        this.api = new ApiTestClient(mockMvc);
        this.jdbcTemplate = jdbcTemplate;
    }

    @BeforeEach
    void setup() {
        truncateAllTables(jdbcTemplate);
    }

    @Test
    void checkoutWithShippingSnapshotsZoneAndUpdatesTotal() throws Exception {
        Store store = storeRepository.save(new Store(UUID.randomUUID(), "shipcheckout", "Ship Checkout"));
        Product product = productRepository.save(new Product(UUID.randomUUID(), store.getId(), "SKU1", "Latte", 500));

        StoreShippingZone exactZone = new StoreShippingZone(
                UUID.randomUUID(),
                store.getId(),
                ShippingZoneType.EXACT,
                "1234",
                null,
                null,
                new BigDecimal("5.00"),
                "ARS"
        );
        storeShippingZoneRepository.save(exactZone);

        HttpHeaders headers = api.storeHostHeaders("shipcheckout");

        Map<String, Object> body = Map.of(
                "buyerEmail", "shipping@example.com",
                "items", List.of(
                        Map.of("productId", product.getId().toString(), "qty", 1)
                ),
                "shipping", Map.of(
                        "postalCode", "1234"
                )
        );

        ApiTestClient.ApiTestResponse response = api.postJson(
                "/api/store/checkout",
                body,
                headers
        );

        assertThat(response.status()).isEqualTo(201);
        String orderId = response.body().get("orderId").toString();

        var order = storeOrderRepository.findById(UUID.fromString(orderId)).orElseThrow();
        assertThat(order.getShippingZoneId()).isEqualTo(exactZone.getId());
        assertThat(order.getShippingPostalCode()).isEqualTo("1234");
        assertThat(order.getShippingCostAmount()).isEqualTo(new BigDecimal("5.00"));
        assertThat(order.getTotalAmount()).isEqualTo(order.getSubtotalAmount().add(new BigDecimal("5.00")));

        var events = outboxEventRepository.findByAggregateIdAndEventType(UUID.fromString(orderId), "STORE_ORDER_CREATED");
        assertThat(events).hasSize(1);
        Map payload = objectMapper.readValue(events.get(0).getPayloadJson(), Map.class);
        Map shipping = (Map) payload.get("shipping");
        assertThat(shipping.get("zoneId").toString()).isEqualTo(exactZone.getId().toString());
        assertThat(shipping.get("postalCode")).isEqualTo("1234");
        assertThat(new BigDecimal(shipping.get("costAmount").toString()))
                .isEqualByComparingTo(new BigDecimal("5.00"));
    }
}
