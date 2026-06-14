package com.barmi.api;

import com.barmi.domain.ecosystem.Ecosystem;
import com.barmi.domain.ecosystem.EcosystemExternalProduct;
import com.barmi.domain.ecosystem.EcosystemPromotion;
import com.barmi.domain.ecosystem.EcosystemPromotionType;
import com.barmi.domain.catalog.Product;
import com.barmi.domain.store.Store;
import com.barmi.infra.repo.EcosystemExternalProductRepository;
import com.barmi.infra.repo.EcosystemPromotionRepository;
import com.barmi.infra.repo.EcosystemRepository;
import com.barmi.infra.repo.ProductRepository;
import com.barmi.infra.repo.StoreRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.w3c.dom.Document;

import javax.xml.parsers.DocumentBuilderFactory;
import java.io.ByteArrayInputStream;
import java.lang.reflect.Field;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.UUID;

import static org.hamcrest.Matchers.nullValue;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
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

    @Autowired
    private ProductRepository productRepository;

    private Ecosystem activeEcosystem;
    private Ecosystem inactiveEcosystem;
    private Ecosystem otherEcosystem;

    @BeforeEach
    void setup() throws Exception {
        productRepository.deleteAll();
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
                .andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.content[0].name").value("External Apple"))
                .andExpect(jsonPath("$.content[0].currency").value("ARS"))
                .andExpect(jsonPath("$.page").value(0))
                .andExpect(jsonPath("$.size").value(24))
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.totalPages").value(1));
    }

    @Test
    void supportsSortAndDeliverySupportedFilter() throws Exception {
        mockMvc.perform(get("/api/public/ecosystems/demo-ecosystem/products")
                        .param("sort", "price,asc")
                        .param("deliverySupported", "true")
                        .param("activeOnly", "true"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.content[0].name").value("External Apple"))
                .andExpect(jsonPath("$.content[0].deliverySupported").value(true));
    }

    @Test
    void supportsLegacyQueryParamAndBasicSorting() throws Exception {
        mockMvc.perform(get("/api/public/ecosystems/demo-ecosystem/products")
                        .param("query", "External")
                        .param("sort", "name,desc")
                        .param("activeOnly", "true"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(2))
                .andExpect(jsonPath("$.content[0].name").value("External Banana"))
                .andExpect(jsonPath("$.content[1].name").value("External Apple"))
                .andExpect(jsonPath("$.totalElements").value(2));
    }

    @Test
    void ranksQueryResultsByExactPrefixSubstringAndDeliveryBoostByDefault() throws Exception {
        replaceProducts(
                product("Green Apple", "25.00", true, true, Instant.parse("2026-01-01T00:00:30Z")),
                product("Apple Pie", "20.00", false, true, Instant.parse("2026-01-01T00:00:20Z")),
                product("Apple", "30.00", false, true, Instant.parse("2026-01-01T00:00:10Z")),
                product("Red Apple", "10.00", false, true, Instant.parse("2026-01-01T00:00:40Z"))
        );

        mockMvc.perform(get("/api/public/ecosystems/demo-ecosystem/products")
                        .param("q", "apple")
                        .param("activeOnly", "true"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(4))
                .andExpect(jsonPath("$.content[0].name").value("Apple"))
                .andExpect(jsonPath("$.content[1].name").value("Apple Pie"))
                .andExpect(jsonPath("$.content[2].name").value("Green Apple"))
                .andExpect(jsonPath("$.content[3].name").value("Red Apple"));
    }

    @Test
    void supportsExplicitRelevanceSortAndLegacyQueryParam() throws Exception {
        replaceProducts(
                product("Mate Cocido", "25.00", true, true, Instant.parse("2026-01-01T00:00:10Z")),
                product("Cocido Mate", "20.00", true, true, Instant.parse("2026-01-01T00:00:20Z")),
                product("Mate", "30.00", true, true, Instant.parse("2026-01-01T00:00:00Z"))
        );

        mockMvc.perform(get("/api/public/ecosystems/demo-ecosystem/products")
                        .param("query", "mate")
                        .param("sort", "relevance")
                        .param("activeOnly", "true"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].name").value("Mate"))
                .andExpect(jsonPath("$.content[1].name").value("Mate Cocido"))
                .andExpect(jsonPath("$.content[2].name").value("Cocido Mate"));
    }

    @Test
    void explicitPriceAndNameSortsOverrideRelevanceWhenQueryIsPresent() throws Exception {
        replaceProducts(
                product("Apple Premium", "30.00", true, true, Instant.parse("2026-01-01T00:00:10Z")),
                product("Apple Budget", "10.00", true, true, Instant.parse("2026-01-01T00:00:20Z")),
                product("Green Apple", "20.00", true, true, Instant.parse("2026-01-01T00:00:30Z"))
        );

        mockMvc.perform(get("/api/public/ecosystems/demo-ecosystem/products")
                        .param("q", "apple")
                        .param("sort", "price,asc")
                        .param("activeOnly", "true"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].name").value("Apple Budget"))
                .andExpect(jsonPath("$.content[1].name").value("Green Apple"))
                .andExpect(jsonPath("$.content[2].name").value("Apple Premium"));

        mockMvc.perform(get("/api/public/ecosystems/demo-ecosystem/products")
                        .param("q", "apple")
                        .param("sort", "name,desc")
                        .param("activeOnly", "true"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].name").value("Green Apple"))
                .andExpect(jsonPath("$.content[1].name").value("Apple Premium"))
                .andExpect(jsonPath("$.content[2].name").value("Apple Budget"));
    }

    @Test
    void deliveryFilterAndActiveOnlyKeepTheirSemanticsWithRelevance() throws Exception {
        EcosystemExternalProduct activeMatch = product("Cafe Especial", "20.00", false, true, Instant.parse("2026-01-01T00:00:10Z"));
        EcosystemExternalProduct inactiveMatch = product("Cafe Especial Inactivo", "10.00", true, false, Instant.parse("2026-01-01T00:00:20Z"));
        replaceProducts(
                activeMatch,
                inactiveMatch,
                product("Cafe Delivery", "30.00", true, true, Instant.parse("2026-01-01T00:00:00Z"))
        );

        mockMvc.perform(get("/api/public/ecosystems/demo-ecosystem/products")
                        .param("q", "cafe")
                        .param("sort", "relevance")
                        .param("deliverySupported", "false")
                        .param("activeOnly", "false"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.content[0].deliverySupported").value(false))
                .andExpect(jsonPath("$.content[0].name").value("Cafe Especial"));

        mockMvc.perform(get("/api/public/ecosystems/demo-ecosystem/products")
                        .param("q", "cafe especial")
                        .param("sort", "relevance")
                        .param("activeOnly", "false"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].name").value("Cafe Especial"))
                .andExpect(jsonPath("$.content[1].name").value("Cafe Especial Inactivo"));
    }

    @Test
    void noQueryKeepsCreatedAtDefaultAndRelevancePaginationIsStable() throws Exception {
        replaceProducts(
                product(UUID.fromString("00000000-0000-0000-0000-000000000002"), "Tie", "20.00", true, true, Instant.parse("2026-01-01T00:00:00Z")),
                product(UUID.fromString("00000000-0000-0000-0000-000000000001"), "Tie", "10.00", true, true, Instant.parse("2026-01-01T00:00:00Z")),
                product(UUID.fromString("00000000-0000-0000-0000-000000000003"), "Newest", "30.00", true, true, Instant.parse("2026-01-01T00:00:30Z"))
        );

        mockMvc.perform(get("/api/public/ecosystems/demo-ecosystem/products")
                        .param("activeOnly", "true"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].name").value("Newest"));

        mockMvc.perform(get("/api/public/ecosystems/demo-ecosystem/products")
                        .param("q", "tie")
                        .param("sort", "relevance")
                        .param("page", "0")
                        .param("size", "1")
                        .param("activeOnly", "true"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].priceAmount").value(10.00))
                .andExpect(jsonPath("$.totalElements").value(2));

        mockMvc.perform(get("/api/public/ecosystems/demo-ecosystem/products")
                        .param("q", "tie")
                        .param("sort", "relevance")
                        .param("page", "1")
                        .param("size", "1")
                        .param("activeOnly", "true"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].priceAmount").value(20.00))
                .andExpect(jsonPath("$.totalElements").value(2));
    }

    @Test
    void paginatesProductsAndReturnsEmptyContentWhenPageIsOutOfRange() throws Exception {
        mockMvc.perform(get("/api/public/ecosystems/demo-ecosystem/products")
                        .param("page", "10")
                        .param("size", "1")
                        .param("activeOnly", "true"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(0))
                .andExpect(jsonPath("$.page").value(10))
                .andExpect(jsonPath("$.size").value(1))
                .andExpect(jsonPath("$.totalElements").value(2))
                .andExpect(jsonPath("$.totalPages").value(2));
    }

    @Test
    void rejectsInvalidProductPaginationParams() throws Exception {
        mockMvc.perform(get("/api/public/ecosystems/demo-ecosystem/products")
                        .param("page", "-1"))
                .andExpect(status().isBadRequest());

        mockMvc.perform(get("/api/public/ecosystems/demo-ecosystem/products")
                        .param("size", "0"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void capsProductPageSizeAtMaximum() throws Exception {
        mockMvc.perform(get("/api/public/ecosystems/demo-ecosystem/products")
                        .param("size", "200"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.size").value(100))
                .andExpect(jsonPath("$.totalElements").value(2));
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

    @Test
    void robotsTxtAllowsPublicPagesAndPointsToSitemap() throws Exception {
        mockMvc.perform(get("/robots.txt")
                        .header("X-Forwarded-Proto", "https")
                        .header("X-Forwarded-Host", "barmi.example"))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", containsString("max-age=3600")))
                .andExpect(content().string(containsString("User-agent: *")))
                .andExpect(content().string(containsString("Disallow: /admin")))
                .andExpect(content().string(containsString("Sitemap: https://barmi.example/sitemap.xml")));
    }

    @Test
    void sitemapIncludesEcosystemAndActiveStoresOnly() throws Exception {
        Store inactiveStore = new Store(UUID.randomUUID(), "inactive-store", "Inactive Store", activeEcosystem);
        inactiveStore.updatePublicCategoryKey("farmacia");
        setActive(inactiveStore, false);
        storeRepository.save(inactiveStore);
        Store encodedSlugStore = new Store(UUID.randomUUID(), "tienda & especial", "Encoded Slug Store", activeEcosystem);
        storeRepository.save(encodedSlugStore);
        Product activeProduct = productRepository.save(new Product(
                UUID.randomUUID(),
                encodedSlugStore.getId(),
                "SKU-ACTIVE",
                "Producto activo",
                1200,
                8
        ));
        setPublicSlug(activeProduct, "pan & campo");
        productRepository.save(activeProduct);
        Product inactiveProduct = productRepository.save(new Product(
                UUID.randomUUID(),
                encodedSlugStore.getId(),
                "SKU-INACTIVE",
                "Producto inactivo",
                1200,
                8
        ));
        inactiveProduct.setActive(false);
        productRepository.save(inactiveProduct);
        productRepository.save(new Product(
                UUID.randomUUID(),
                inactiveStore.getId(),
                "SKU-INACTIVE-STORE",
                "Producto de store inactiva",
                1200,
                8
        ));

        MvcResult result = mockMvc.perform(get("/sitemap.xml")
                        .header("X-Forwarded-Proto", "https")
                        .header("X-Forwarded-Host", "barmi.example"))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", containsString("max-age=3600")))
                .andExpect(content().string(containsString("<loc>https://barmi.example/ecosystem</loc>")))
                .andExpect(content().string(containsString("<loc>https://barmi.example/ecosystem/catalog</loc>")))
                .andExpect(content().string(containsString("<loc>https://barmi.example/public/new-store</loc>")))
                .andExpect(content().string(containsString("<loc>https://barmi.example/public/older-store</loc>")))
                .andExpect(content().string(containsString("<loc>https://barmi.example/public/hidden-map-store</loc>")))
                .andExpect(content().string(containsString("<loc>https://barmi.example/public/tienda%20%26%20especial</loc>")))
                .andExpect(content().string(containsString("<loc>https://barmi.example/public/tienda%20%26%20especial/products/pan%20%26%20campo</loc>")))
                .andExpect(content().string(containsString("<loc>https://barmi.example/ecosystem/categories/almacen</loc>")))
                .andExpect(content().string(containsString("<loc>https://barmi.example/ecosystem/categories/panaderia</loc>")))
                .andExpect(content().string(org.hamcrest.Matchers.not(containsString("/ecosystem/categories/farmacia"))))
                .andExpect(content().string(org.hamcrest.Matchers.not(containsString("/ecosystem/categories/cafeteria"))))
                .andExpect(content().string(org.hamcrest.Matchers.not(containsString("producto-inactivo"))))
                .andExpect(content().string(org.hamcrest.Matchers.not(containsString("producto-de-store-inactiva"))))
                .andExpect(content().string(org.hamcrest.Matchers.not(containsString("inactive-store"))))
                .andExpect(content().string(org.hamcrest.Matchers.not(containsString("other-ecosystem-store"))))
                .andExpect(content().string(org.hamcrest.Matchers.not(containsString("global-store"))))
                .andReturn();

        Document document = DocumentBuilderFactory.newInstance()
                .newDocumentBuilder()
                .parse(new ByteArrayInputStream(result.getResponse().getContentAsString().getBytes(StandardCharsets.UTF_8)));
        document.getDocumentElement().normalize();
    }

    private void setActive(Ecosystem ecosystem, boolean active) throws Exception {
        Field field = Ecosystem.class.getDeclaredField("active");
        field.setAccessible(true);
        field.set(ecosystem, active);
    }

    private void setActive(Store store, boolean active) throws Exception {
        Field field = Store.class.getDeclaredField("active");
        field.setAccessible(true);
        field.set(store, active);
    }

    private void setPublicSlug(Product product, String publicSlug) throws Exception {
        Field field = Product.class.getDeclaredField("publicSlug");
        field.setAccessible(true);
        field.set(product, publicSlug);
    }

    private void setCreatedAt(Store store, Instant createdAt) throws Exception {
        Field field = Store.class.getDeclaredField("createdAt");
        field.setAccessible(true);
        field.set(store, createdAt);
    }

    private void replaceProducts(EcosystemExternalProduct... products) {
        ecosystemExternalProductRepository.deleteAll();
        for (EcosystemExternalProduct product : products) {
            ecosystemExternalProductRepository.save(product);
        }
    }

    private EcosystemExternalProduct product(String name, String price, boolean deliverySupported, boolean active, Instant createdAt) throws Exception {
        return product(UUID.randomUUID(), name, price, deliverySupported, active, createdAt);
    }

    private EcosystemExternalProduct product(UUID id, String name, String price, boolean deliverySupported, boolean active, Instant createdAt) throws Exception {
        EcosystemExternalProduct product = new EcosystemExternalProduct(
                id,
                activeEcosystem,
                name,
                new BigDecimal(price),
                "ARS",
                deliverySupported
        );
        product.setActive(active);
        setCreatedAt(product, createdAt);
        return product;
    }

    private void setCreatedAt(EcosystemExternalProduct product, Instant createdAt) throws Exception {
        Field field = EcosystemExternalProduct.class.getDeclaredField("createdAt");
        field.setAccessible(true);
        field.set(product, createdAt);
    }
}
