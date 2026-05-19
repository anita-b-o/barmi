package com.barmi.api;

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
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.lang.reflect.Field;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class EcosystemPublicDiscoveryTest {

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

    private Ecosystem activeEcosystem;
    private Ecosystem inactiveEcosystem;
    private Ecosystem otherEcosystem;

    @BeforeEach
    void setup() throws Exception {
        storeRepository.deleteAll();
        ecosystemExternalProductRepository.deleteAll();
        ecosystemPromotionRepository.deleteAll();
        ecosystemRepository.deleteAll();

        activeEcosystem = new Ecosystem(
                UUID.randomUUID(),
                "Demo Ecosystem",
                "demo-ecosystem"
        );
        ecosystemRepository.save(activeEcosystem);

        inactiveEcosystem = new Ecosystem(
                UUID.randomUUID(),
                "Inactive Ecosystem",
                "inactive-ecosystem"
        );
        setActive(inactiveEcosystem, false);
        ecosystemRepository.save(inactiveEcosystem);

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

        Store otherEcosystemStore = new Store(UUID.randomUUID(), "other-ecosystem-store", "Other Ecosystem Store", otherEcosystem);
        setCreatedAt(otherEcosystemStore, Instant.now().plusSeconds(20));
        otherEcosystemStore.updatePublicLocation("Rosario", new BigDecimal("-32.944242"), new BigDecimal("-60.650539"));
        storeRepository.save(otherEcosystemStore);

        Store unassignedStore = new Store(UUID.randomUUID(), "global-store", "Global Store");
        setCreatedAt(unassignedStore, Instant.now().plusSeconds(30));
        unassignedStore.updatePublicLocation("Mar del Plata", new BigDecimal("-38.005477"), new BigDecimal("-57.542611"));
        storeRepository.save(unassignedStore);

        EcosystemExternalProduct apple = new EcosystemExternalProduct(
                UUID.randomUUID(),
                activeEcosystem,
                "External Apple",
                new BigDecimal("150.00"),
                "ARS",
                true
        );

        EcosystemExternalProduct banana = new EcosystemExternalProduct(
                UUID.randomUUID(),
                activeEcosystem,
                "External Banana",
                new BigDecimal("120.00"),
                "ARS",
                false
        );

        EcosystemExternalProduct carrot = new EcosystemExternalProduct(
                UUID.randomUUID(),
                activeEcosystem,
                "External Carrot",
                new BigDecimal("190.00"),
                "ARS",
                true
        );
        carrot.setActive(false);

        ecosystemExternalProductRepository.save(apple);
        ecosystemExternalProductRepository.save(banana);
        ecosystemExternalProductRepository.save(carrot);

        ecosystemPromotionRepository.save(new EcosystemPromotion(
                UUID.randomUUID(),
                activeEcosystem.getId(),
                "BIENVENIDA10",
                EcosystemPromotionType.PERCENTAGE,
                new BigDecimal("10.00"),
                true,
                Instant.now().plusSeconds(86400),
                5L
        ));
        ecosystemPromotionRepository.save(new EcosystemPromotion(
                UUID.randomUUID(),
                activeEcosystem.getId(),
                "INACTIVA",
                EcosystemPromotionType.FIXED,
                new BigDecimal("1000.00"),
                false,
                null,
                null
        ));
        EcosystemPromotion exhaustedPromotion = ecosystemPromotionRepository.save(new EcosystemPromotion(
                UUID.randomUUID(),
                activeEcosystem.getId(),
                "AGOTADA",
                EcosystemPromotionType.FIXED,
                new BigDecimal("500.00"),
                true,
                null,
                1L
        ));
        exhaustedPromotion.incrementUsage();
        ecosystemPromotionRepository.save(exhaustedPromotion);
        ecosystemPromotionRepository.save(new EcosystemPromotion(
                UUID.randomUUID(),
                activeEcosystem.getId(),
                "VENCIDA",
                EcosystemPromotionType.FIXED,
                new BigDecimal("500.00"),
                true,
                Instant.now().minusSeconds(3600),
                null
        ));
    }

    @Test
    void getsEcosystemBySlug() throws Exception {
        mockMvc.perform(get("/api/public/ecosystems/demo-ecosystem"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(activeEcosystem.getId().toString()))
                .andExpect(jsonPath("$.slug").value("demo-ecosystem"))
                .andExpect(jsonPath("$.name").value("Demo Ecosystem"))
                .andExpect(jsonPath("$.promotions.length()").value(1))
                .andExpect(jsonPath("$.promotions[0].code").value("BIENVENIDA10"))
                .andExpect(jsonPath("$.promotions[0].shortLabel").value("BIENVENIDA10 · 10% OFF"));
    }

    @Test
    void returnsNotFoundForMissingEcosystem() throws Exception {
        mockMvc.perform(get("/api/public/ecosystems/unknown"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.code").value("ecosystem_not_found"));
    }

    @Test
    void returnsForbiddenForInactiveEcosystem() throws Exception {
        mockMvc.perform(get("/api/public/ecosystems/inactive-ecosystem"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("ecosystem_inactive"));
    }

    @Test
    void listsProductsBySlug() throws Exception {
        mockMvc.perform(get("/api/public/ecosystems/demo-ecosystem/products")
                .param("q", "Apple")
                .param("activeOnly", "true")
                .contentType(MediaType.APPLICATION_JSON)
        )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].name").value("External Apple"))
                .andExpect(jsonPath("$[0].currency").value("ARS"));
    }

    @Test
    void supportsSortAndDeliverySupportedFilter() throws Exception {
        mockMvc.perform(get("/api/public/ecosystems/demo-ecosystem/products")
                        .param("sort", "price,asc")
                        .param("deliverySupported", "true")
                        .param("activeOnly", "true"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].name").value("External Apple"))
                .andExpect(jsonPath("$[0].deliverySupported").value(true));
    }

    @Test
    void supportsLegacyQueryParamAndBasicSorting() throws Exception {
        mockMvc.perform(get("/api/public/ecosystems/demo-ecosystem/products")
                        .param("query", "External")
                        .param("sort", "name,desc")
                        .param("activeOnly", "true"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].name").value("External Banana"))
                .andExpect(jsonPath("$[1].name").value("External Apple"));
    }

    @Test
    void returnsForbiddenForInactiveEcosystemProducts() throws Exception {
        mockMvc.perform(get("/api/public/ecosystems/inactive-ecosystem/products"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("ecosystem_inactive"));
    }

    @Test
    void getsHomeBlocksForPublicEcosystem() throws Exception {
        mockMvc.perform(get("/api/public/ecosystems/demo-ecosystem/home"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ecosystem.slug").value("demo-ecosystem"))
                .andExpect(jsonPath("$.ecosystem.promotions.length()").value(1))
                .andExpect(jsonPath("$.newStores.length()").value(3))
                .andExpect(jsonPath("$.newStores[0].slug").value("new-store"))
                .andExpect(jsonPath("$.newStores[0].category.key").value("almacen"))
                .andExpect(jsonPath("$.newStores[?(@.slug=='older-store')]").exists())
                .andExpect(jsonPath("$.newStores[?(@.slug=='hidden-map-store')]").exists())
                .andExpect(jsonPath("$.storeCategories.length()").value(2))
                .andExpect(jsonPath("$.storeCategories[0].key").value("almacen"))
                .andExpect(jsonPath("$.promotionProducts.length()").value(2))
                .andExpect(jsonPath("$.promotionProducts[0].name").value("External Banana"))
                .andExpect(jsonPath("$.deliveryProducts.length()").value(1))
                .andExpect(jsonPath("$.deliveryProducts[0].name").value("External Apple"))
                .andExpect(jsonPath("$.deliveryProducts[0].deliverySupported").value(true))
                .andExpect(jsonPath("$.newStores[?(@.slug=='other-ecosystem-store')]").isEmpty())
                .andExpect(jsonPath("$.newStores[?(@.slug=='global-store')]").isEmpty());
    }

    @Test
    void getsPublicStoresMapWithNameFilter() throws Exception {
        mockMvc.perform(get("/api/public/ecosystems/demo-ecosystem/stores/map")
                        .param("q", "New"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ecosystem.slug").value("demo-ecosystem"))
                .andExpect(jsonPath("$.categories.length()").value(2))
                .andExpect(jsonPath("$.categories[0].key").value("almacen"))
                .andExpect(jsonPath("$.stores.length()").value(1))
                .andExpect(jsonPath("$.stores[0].slug").value("new-store"))
                .andExpect(jsonPath("$.stores[0].category.key").value("almacen"))
                .andExpect(jsonPath("$.stores[0].locationLabel").value("La Plata Centro"))
                .andExpect(jsonPath("$.stores[0].latitude").value(-34.920494))
                .andExpect(jsonPath("$.stores[0].longitude").value(-57.953565));
    }

    @Test
    void filtersPublicStoresMapByCategoryAndQuery() throws Exception {
        mockMvc.perform(get("/api/public/ecosystems/demo-ecosystem/stores/map")
                        .param("category", "panaderia")
                        .param("q", "Older"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.stores.length()").value(1))
                .andExpect(jsonPath("$.stores[0].slug").value("older-store"))
                .andExpect(jsonPath("$.stores[0].category.key").value("panaderia"))
                .andExpect(jsonPath("$.stores[?(@.slug=='new-store')]").isEmpty());
    }

    @Test
    void excludesStoresOutsideTheRequestedEcosystemFromMap() throws Exception {
        mockMvc.perform(get("/api/public/ecosystems/demo-ecosystem/stores/map"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.stores.length()").value(2))
                .andExpect(jsonPath("$.stores[?(@.slug=='new-store')]").exists())
                .andExpect(jsonPath("$.stores[?(@.slug=='older-store')]").exists())
                .andExpect(jsonPath("$.stores[?(@.slug=='other-ecosystem-store')]").isEmpty())
                .andExpect(jsonPath("$.stores[?(@.slug=='hidden-map-store')]").isEmpty())
                .andExpect(jsonPath("$.stores[?(@.slug=='global-store')]").isEmpty());
    }

    @Test
    void supportsListingAllStoresAndStoreSortingForMapExperience() throws Exception {
        mockMvc.perform(get("/api/public/ecosystems/demo-ecosystem/stores/map")
                        .param("location", "all")
                        .param("sort", "name,desc"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.stores.length()").value(3))
                .andExpect(jsonPath("$.stores[0].slug").value("older-store"))
                .andExpect(jsonPath("$.stores[1].slug").value("new-store"))
                .andExpect(jsonPath("$.stores[2].slug").value("hidden-map-store"))
                .andExpect(jsonPath("$.stores[2].hasPublicLocation").value(false))
                .andExpect(jsonPath("$.stores[2].latitude").value(nullValue()))
                .andExpect(jsonPath("$.stores[2].longitude").value(nullValue()));
    }

    private void setActive(Ecosystem ecosystem, boolean active) throws Exception {
        Field field = Ecosystem.class.getDeclaredField("active");
        field.setAccessible(true);
        field.set(ecosystem, active);
    }

    private void setCreatedAt(Store store, Instant createdAt) throws Exception {
        Field field = Store.class.getDeclaredField("createdAt");
        field.setAccessible(true);
        field.set(store, createdAt);
    }
}
