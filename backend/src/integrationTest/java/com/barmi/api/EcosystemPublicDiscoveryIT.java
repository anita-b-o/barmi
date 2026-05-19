package com.barmi.api;

import com.barmi.PostgresIntegrationTestBase;
import com.barmi.domain.ecosystem.Ecosystem;
import com.barmi.domain.ecosystem.EcosystemExternalProduct;
import com.barmi.domain.ecosystem.EcosystemPromotion;
import com.barmi.domain.ecosystem.EcosystemPromotionType;
import com.barmi.domain.store.Store;
import com.barmi.infra.repo.EcosystemExternalProductRepository;
import com.barmi.infra.repo.EcosystemPromotionRepository;
import com.barmi.infra.repo.EcosystemRepository;
import com.barmi.infra.repo.StoreRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

import java.lang.reflect.Field;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@AutoConfigureMockMvc
class EcosystemPublicDiscoveryIT extends PostgresIntegrationTestBase {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private EcosystemRepository ecosystemRepository;

    @Autowired
    private EcosystemExternalProductRepository ecosystemExternalProductRepository;

    @Autowired
    private EcosystemPromotionRepository ecosystemPromotionRepository;

    @Autowired
    private StoreRepository storeRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private Ecosystem activeEcosystem;
    private Ecosystem otherEcosystem;

    @BeforeEach
    void setup() throws Exception {
        truncateAllTables(jdbcTemplate);

        activeEcosystem = ecosystemRepository.save(new Ecosystem(
                UUID.randomUUID(),
                "Demo Ecosystem",
                "demo-ecosystem"
        ));

        otherEcosystem = ecosystemRepository.save(new Ecosystem(
                UUID.randomUUID(),
                "Other Ecosystem",
                "other-ecosystem"
        ));

        Store newestStore = new Store(UUID.randomUUID(), "new-store", "New Store", activeEcosystem);
        setCreatedAt(newestStore, Instant.now().plusSeconds(10));
        newestStore.updatePublicLocation("La Plata Centro", new BigDecimal("-34.920494"), new BigDecimal("-57.953565"));
        newestStore.updatePublicCategoryKey("almacen");
        storeRepository.save(newestStore);

        Store olderStore = new Store(UUID.randomUUID(), "older-store", "Older Store", activeEcosystem);
        setCreatedAt(olderStore, Instant.now().minusSeconds(86400));
        olderStore.updatePublicLocation("Palermo", new BigDecimal("-34.588921"), new BigDecimal("-58.430169"));
        olderStore.updatePublicCategoryKey("panaderia");
        storeRepository.save(olderStore);

        Store noLocationStore = new Store(UUID.randomUUID(), "hidden-map-store", "Hidden Map Store", activeEcosystem);
        setCreatedAt(noLocationStore, Instant.now().minusSeconds(3600));
        storeRepository.save(noLocationStore);

        Store otherStore = new Store(UUID.randomUUID(), "other-store", "Other Store", otherEcosystem);
        setCreatedAt(otherStore, Instant.now().plusSeconds(20));
        otherStore.updatePublicLocation("Cordoba", new BigDecimal("-31.420083"), new BigDecimal("-64.188776"));
        storeRepository.save(otherStore);

        Store unassignedStore = new Store(UUID.randomUUID(), "global-store", "Global Store");
        setCreatedAt(unassignedStore, Instant.now().plusSeconds(30));
        unassignedStore.updatePublicLocation("Mar del Plata", new BigDecimal("-38.005477"), new BigDecimal("-57.542611"));
        storeRepository.save(unassignedStore);

        ecosystemExternalProductRepository.save(new EcosystemExternalProduct(
                UUID.randomUUID(),
                activeEcosystem,
                "External Apple",
                new BigDecimal("150.00"),
                "ARS",
                true
        ));
        ecosystemExternalProductRepository.save(new EcosystemExternalProduct(
                UUID.randomUUID(),
                activeEcosystem,
                "External Banana",
                new BigDecimal("120.00"),
                "ARS",
                false
        ));

        ecosystemPromotionRepository.save(new EcosystemPromotion(
                UUID.randomUUID(),
                activeEcosystem.getId(),
                "BIENVENIDA10",
                EcosystemPromotionType.PERCENTAGE,
                new BigDecimal("10.00"),
                true,
                Instant.now().plusSeconds(86400),
                null
        ));
    }

    @Test
    void listsPublicProductsWithoutOptionalQueryParams() throws Exception {
        mockMvc.perform(get("/api/public/ecosystems/demo-ecosystem/products"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].name").value("External Banana"))
                .andExpect(jsonPath("$[1].name").value("External Apple"));
    }

    @Test
    void getsPublicHomeWithoutQueryParamFailures() throws Exception {
        mockMvc.perform(get("/api/public/ecosystems/demo-ecosystem/home"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ecosystem.slug").value("demo-ecosystem"))
                .andExpect(jsonPath("$.newStores.length()").value(3))
                .andExpect(jsonPath("$.newStores[0].slug").value("new-store"))
                .andExpect(jsonPath("$.newStores[0].category.key").value("almacen"))
                .andExpect(jsonPath("$.newStores[?(@.slug=='hidden-map-store')]").exists())
                .andExpect(jsonPath("$.storeCategories.length()").value(2))
                .andExpect(jsonPath("$.promotionProducts.length()").value(2))
                .andExpect(jsonPath("$.deliveryProducts.length()").value(1))
                .andExpect(jsonPath("$.deliveryProducts[0].name").value("External Apple"))
                .andExpect(jsonPath("$.newStores[?(@.slug=='other-store')]").isEmpty())
                .andExpect(jsonPath("$.newStores[?(@.slug=='global-store')]").isEmpty());
    }

    @Test
    void filtersPublicStoresMapByEcosystemAndName() throws Exception {
        mockMvc.perform(get("/api/public/ecosystems/demo-ecosystem/stores/map").param("q", "New"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.stores.length()").value(1))
                .andExpect(jsonPath("$.stores[0].slug").value("new-store"));
    }

    @Test
    void includesStoresWithoutCoordinatesWhenRequestedForListing() throws Exception {
        mockMvc.perform(get("/api/public/ecosystems/demo-ecosystem/stores/map").param("location", "all"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.categories.length()").value(2))
                .andExpect(jsonPath("$.stores.length()").value(3))
                .andExpect(jsonPath("$.stores[?(@.slug=='hidden-map-store')]").exists());
    }

    @Test
    void filtersPublicStoresMapByCategory() throws Exception {
        mockMvc.perform(get("/api/public/ecosystems/demo-ecosystem/stores/map").param("category", "panaderia"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.stores.length()").value(1))
                .andExpect(jsonPath("$.stores[0].slug").value("older-store"))
                .andExpect(jsonPath("$.stores[0].category.key").value("panaderia"));
    }

    private void setCreatedAt(Store store, Instant createdAt) throws Exception {
        Field field = Store.class.getDeclaredField("createdAt");
        field.setAccessible(true);
        field.set(store, createdAt);
    }
}
