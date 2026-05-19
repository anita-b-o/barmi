package com.barmi.api;

import com.barmi.PostgresIntegrationTestBase;
import com.barmi.domain.ecosystem.Ecosystem;
import com.barmi.domain.orders.EcosystemOrder;
import com.barmi.domain.orders.EcosystemOrderItem;
import com.barmi.domain.orders.StoreOrder;
import com.barmi.domain.orders.StoreOrderItem;
import com.barmi.domain.store.Store;
import com.barmi.infra.repo.EcosystemOrderRepository;
import com.barmi.infra.repo.EcosystemRepository;
import com.barmi.infra.repo.PaymentIntentRepository;
import com.barmi.infra.repo.StoreOrderRepository;
import com.barmi.infra.repo.StoreRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@AutoConfigureMockMvc
class PaymentInitiationIntegrationTest extends PostgresIntegrationTestBase {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private StoreRepository storeRepository;

    @Autowired
    private StoreOrderRepository storeOrderRepository;

    @Autowired
    private EcosystemRepository ecosystemRepository;

    @Autowired
    private EcosystemOrderRepository ecosystemOrderRepository;

    @Autowired
    private PaymentIntentRepository paymentIntentRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private Store store;
    private StoreOrder storeOrder;
    private Ecosystem ecosystem;
    private EcosystemOrder ecosystemOrder;
    private String storeSlug;
    private String ecosystemSlug;

    @BeforeEach
    void setup() {
        truncateAllTables(jdbcTemplate);

        storeSlug = "demo-" + UUID.randomUUID();
        ecosystemSlug = "demo-eco-" + UUID.randomUUID();

        store = new Store(UUID.randomUUID(), storeSlug, "Demo");
        storeRepository.save(store);

        storeOrder = buildStoreOrder(UUID.randomUUID(), store.getId());
        storeOrderRepository.save(storeOrder);

        ecosystem = new Ecosystem(UUID.randomUUID(), "Demo Ecosystem", ecosystemSlug);
        ecosystemRepository.save(ecosystem);

        ecosystemOrder = buildEcosystemOrder(UUID.randomUUID(), ecosystem);
        ecosystemOrderRepository.save(ecosystemOrder);
    }

    @Test
    void initiatesStorePayment() throws Exception {
        String payload = """
                {
                  "orderId": "%s",
                  "provider": "MERCADOPAGO",
                  "returnUrl": "https://frontend.example.com/payment-return"
                }
                """.formatted(storeOrder.getId());

        mockMvc.perform(post("/api/store/payments/initiate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("Host", storeSlug + ".example.com")
                        .header("X-Forwarded-Host", storeSlug + ".example.com")
                        .content(payload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.intentId").isNotEmpty())
                .andExpect(jsonPath("$.scope").value("STORE"))
                .andExpect(jsonPath("$.orderId").value(storeOrder.getId().toString()))
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.amount").value(100.00))
                .andExpect(jsonPath("$.currency").value("ARS"))
                .andExpect(jsonPath("$.checkoutUrl").isNotEmpty())
                .andExpect(jsonPath("$.provider").value("MERCADOPAGO"));
    }

    @Test
    void initiatesEcosystemPayment() throws Exception {
        String payload = """
                {
                  "ecosystemId": "%s",
                  "orderId": "%s",
                  "provider": "MERCADOPAGO",
                  "returnUrl": "https://frontend.example.com/payment-return"
                }
                """.formatted(ecosystem.getId(), ecosystemOrder.getId());

        mockMvc.perform(post("/api/ecosystem/payments/initiate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.intentId").isNotEmpty())
                .andExpect(jsonPath("$.scope").value("ECOSYSTEM"))
                .andExpect(jsonPath("$.orderId").value(ecosystemOrder.getId().toString()))
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.amount").value(150.00))
                .andExpect(jsonPath("$.currency").value("ARS"))
                .andExpect(jsonPath("$.checkoutUrl").isNotEmpty())
                .andExpect(jsonPath("$.provider").value("MERCADOPAGO"));
    }

    private StoreOrder buildStoreOrder(UUID orderId, UUID storeId) {
        StoreOrderItem item = new StoreOrderItem(
                UUID.randomUUID(),
                orderId,
                UUID.randomUUID(),
                1,
                new BigDecimal("100.00"),
                new BigDecimal("100.00"),
                "ARS",
                "{\"name\":\"Item\"}"
        );

        return StoreOrder.create(
                orderId,
                storeId,
                "ARS",
                new BigDecimal("100.00"),
                new BigDecimal("100.00"),
                BigDecimal.ZERO,
                "",
                null,
                null,
                List.of(item)
        );
    }

    private EcosystemOrder buildEcosystemOrder(UUID orderId, Ecosystem ecosystem) {
        EcosystemOrderItem item = new EcosystemOrderItem(
                UUID.randomUUID(),
                UUID.randomUUID(),
                1,
                new BigDecimal("150.00"),
                new BigDecimal("150.00"),
                "{\"name\":\"Item\",\"currency\":\"ARS\"}"
        );

        return EcosystemOrder.create(
                orderId,
                ecosystem,
                "ARS",
                new BigDecimal("150.00"),
                BigDecimal.ZERO,
                "",
                null,
                null,
                new BigDecimal("150.00"),
                List.of(item)
        );
    }
}
