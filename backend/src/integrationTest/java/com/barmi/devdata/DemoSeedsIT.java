package com.barmi.devdata;

import com.barmi.PostgresIntegrationTestBase;
import com.barmi.app.store.StoreReadinessService;
import com.barmi.domain.store.Store;
import com.barmi.infra.repo.EcosystemRepository;
import com.barmi.infra.repo.ProductRepository;
import com.barmi.infra.repo.StoreOrderRepository;
import com.barmi.infra.repo.StorePromotionRepository;
import com.barmi.infra.repo.StoreRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@AutoConfigureMockMvc
class DemoSeedsIT extends PostgresIntegrationTestBase {

    private final MockMvc mockMvc;
    private final JdbcTemplate jdbcTemplate;
    private final StoreRepository storeRepository;
    private final ProductRepository productRepository;
    private final StorePromotionRepository storePromotionRepository;
    private final StoreOrderRepository storeOrderRepository;
    private final EcosystemRepository ecosystemRepository;
    private final StoreReadinessService storeReadinessService;

    @Autowired
    DemoSeedsIT(
            MockMvc mockMvc,
            JdbcTemplate jdbcTemplate,
            StoreRepository storeRepository,
            ProductRepository productRepository,
            StorePromotionRepository storePromotionRepository,
            StoreOrderRepository storeOrderRepository,
            EcosystemRepository ecosystemRepository,
            StoreReadinessService storeReadinessService
    ) {
        this.mockMvc = mockMvc;
        this.jdbcTemplate = jdbcTemplate;
        this.storeRepository = storeRepository;
        this.productRepository = productRepository;
        this.storePromotionRepository = storePromotionRepository;
        this.storeOrderRepository = storeOrderRepository;
        this.ecosystemRepository = ecosystemRepository;
        this.storeReadinessService = storeReadinessService;
    }

    @BeforeEach
    void setUp() {
        truncateAllTables(jdbcTemplate);
    }

    @AfterEach
    void tearDown() {
        truncateAllTables(jdbcTemplate);
    }

    @Test
    void listsAvailableScenarios() throws Exception {
        mockMvc.perform(get("/api/admin/dev/seeds"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].key").value("ecommerce"))
                .andExpect(jsonPath("$[5].key").value("all"));
    }

    @Test
    void seedsAllScenariosAndIsIdempotent() throws Exception {
        mockMvc.perform(post("/api/admin/dev/seeds/all"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.createdStores").value(14))
                .andExpect(jsonPath("$.createdProducts").value(80))
                .andExpect(jsonPath("$.createdPromotions").value(14))
                .andExpect(jsonPath("$.createdOrders").value(35))
                .andExpect(jsonPath("$.createdEcosystems").value(1));

        assertThat(storeRepository.findBySlug("casa-roja")).isPresent();
        assertThat(storeRepository.findBySlug("estudio-fernandez")).isPresent();
        assertThat(storeRepository.findBySlug("ana-fotografia")).isPresent();
        assertThat(storeRepository.findBySlug("mi-nueva-tienda")).isPresent();
        assertThat(ecosystemRepository.findBySlug("ecosystem-demo")).isPresent();

        mockMvc.perform(post("/api/admin/dev/seeds/all"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.createdStores").value(0))
                .andExpect(jsonPath("$.createdProducts").value(0))
                .andExpect(jsonPath("$.createdPromotions").value(0))
                .andExpect(jsonPath("$.createdOrders").value(0))
                .andExpect(jsonPath("$.createdEcosystems").value(0));

        Store casaRoja = storeRepository.findBySlug("casa-roja").orElseThrow();
        assertThat(productRepository.countByStoreIdAndActiveTrue(casaRoja.getId())).isEqualTo(20);
        assertThat(storePromotionRepository.findByStoreIdOrderByCreatedAtDesc(casaRoja.getId())).hasSize(2);
        assertThat(storeOrderRepository.countByStoreId(casaRoja.getId())).isEqualTo(15);
    }

    @Test
    void createsExpectedReadinessProfiles() throws Exception {
        mockMvc.perform(post("/api/admin/dev/seeds/all"))
                .andExpect(status().isOk());

        Store casaRoja = storeRepository.findBySlug("casa-roja").orElseThrow();
        Store services = storeRepository.findBySlug("estudio-fernandez").orElseThrow();
        Store portfolio = storeRepository.findBySlug("ana-fotografia").orElseThrow();
        Store newStore = storeRepository.findBySlug("mi-nueva-tienda").orElseThrow();

        assertThat(storeReadinessService.evaluate(casaRoja).score()).isEqualTo(100);
        assertThat(storeReadinessService.evaluate(casaRoja).publishReady()).isTrue();
        assertThat(storeReadinessService.evaluate(services).publishReady()).isTrue();
        assertThat(storeReadinessService.evaluate(portfolio).publishReady()).isTrue();
        assertThat(storeReadinessService.evaluate(newStore).score()).isZero();
        assertThat(storeReadinessService.evaluate(newStore).publishReady()).isFalse();
    }
}
