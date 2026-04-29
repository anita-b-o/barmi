package com.barmi.catalog;

import com.barmi.domain.catalog.Product;
import com.barmi.domain.catalog.StoreCategory;
import com.barmi.domain.catalog.StorePromotion;
import com.barmi.domain.catalog.StorePromotionType;
import com.barmi.domain.store.Store;
import com.barmi.domain.store.StoreMember;
import com.barmi.domain.store.StoreMemberRole;
import com.barmi.domain.store.StoreMemberStatus;
import com.barmi.domain.users.User;
import com.barmi.domain.users.UserStatus;
import com.barmi.infra.repo.ProductRepository;
import com.barmi.infra.repo.RefreshTokenRepository;
import com.barmi.infra.repo.StoreCategoryRepository;
import com.barmi.infra.repo.StoreMemberRepository;
import com.barmi.infra.repo.StorePromotionRepository;
import com.barmi.infra.repo.StoreRepository;
import com.barmi.infra.repo.UserRepository;
import com.barmi.testsupport.ApiTestClient;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.TestConstructor;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase.Replace.NONE;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

@Testcontainers
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "jwt.secret=this_is_a_super_long_test_secret_key_that_is_at_least_32_bytes_long",
        "app.money.defaultCurrency=ARS",
        "app.security.allowDevIdentityHeader=true"
})
@org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
@TestConstructor(autowireMode = TestConstructor.AutowireMode.ALL)
@ActiveProfiles("integrationtest")
@AutoConfigureTestDatabase(replace = NONE)
class StoreAdminProductIT {

    private static final ObjectMapper MAPPER = new ObjectMapper();

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
    private final StoreMemberRepository storeMemberRepository;
    private final ProductRepository productRepository;
    private final StoreCategoryRepository storeCategoryRepository;
    private final StorePromotionRepository storePromotionRepository;
    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final MockMvc mockMvc;
    private final ApiTestClient api;

    @Autowired
    StoreAdminProductIT(
            StoreRepository storeRepository,
            StoreMemberRepository storeMemberRepository,
            ProductRepository productRepository,
            StoreCategoryRepository storeCategoryRepository,
            StorePromotionRepository storePromotionRepository,
            UserRepository userRepository,
            RefreshTokenRepository refreshTokenRepository,
            PasswordEncoder passwordEncoder,
            MockMvc mockMvc
    ) {
        this.storeRepository = storeRepository;
        this.storeMemberRepository = storeMemberRepository;
        this.productRepository = productRepository;
        this.storeCategoryRepository = storeCategoryRepository;
        this.storePromotionRepository = storePromotionRepository;
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.mockMvc = mockMvc;
        this.api = new ApiTestClient(mockMvc);
    }

    @Test
    void adminCrudTenantIsolationAndPublicFiltering() throws Exception {
        String slug1 = "store-products-" + UUID.randomUUID();
        String slug2 = "store-products-2-" + UUID.randomUUID();
        Store store = storeRepository.save(new Store(UUID.randomUUID(), slug1, "Store Products"));
        Store otherStore = storeRepository.save(new Store(UUID.randomUUID(), slug2, "Store Products 2"));

        refreshTokenRepository.deleteAll();
        userRepository.deleteAll();
        storeMemberRepository.deleteAll();

        String adminEmail = "admin-" + UUID.randomUUID() + "@store.test";
        String admin2Email = "admin2-" + UUID.randomUUID() + "@store.test";
        userRepository.save(new User(UUID.randomUUID(), adminEmail, passwordEncoder.encode("secret"), UserStatus.ACTIVE));
        userRepository.save(new User(UUID.randomUUID(), admin2Email, passwordEncoder.encode("secret"), UserStatus.ACTIVE));
        storeMemberRepository.save(new StoreMember(UUID.randomUUID(), store.getId(), adminEmail, StoreMemberRole.ADMIN, StoreMemberStatus.ACTIVE));
        storeMemberRepository.save(new StoreMember(UUID.randomUUID(), otherStore.getId(), admin2Email, StoreMemberRole.ADMIN, StoreMemberStatus.ACTIVE));

        HttpHeaders adminHeaders = api.storeHostHeaders(slug1);
        adminHeaders.setBearerAuth(loginAndGetAccessToken(adminEmail));
        HttpHeaders otherAdminHeaders = api.storeHostHeaders(slug2);
        otherAdminHeaders.setBearerAuth(loginAndGetAccessToken(admin2Email));

        ApiTestClient.ApiTestResponse createResponse = api.postJson(
                "/api/store/products",
                Map.of("sku", "SKU-1", "name", "Cafe", "priceCents", 1200, "stockQuantity", 5),
                adminHeaders
        );
        assertThat(createResponse.status()).isEqualTo(201);
        assertThat(createResponse.body().get("sku")).isEqualTo("SKU-1");
        assertThat(createResponse.body().get("stockQuantity")).isEqualTo(5);
        assertThat(createResponse.body().get("isAvailable")).isEqualTo(true);
        String productId = createResponse.body().get("id").toString();

        ApiTestClient.ApiTestResponse duplicateSkuResponse = api.postJson(
                "/api/store/products",
                Map.of("sku", "SKU-1", "name", "Otro", "priceCents", 1300, "stockQuantity", 3),
                adminHeaders
        );
        assertThat(duplicateSkuResponse.status()).isEqualTo(409);
        assertThat(errorCodeOf(duplicateSkuResponse)).isEqualTo("product_sku_conflict");

        List<Map<String, Object>> listedProducts = getList("/api/store/products", adminHeaders);
        assertThat(listedProducts).hasSize(1);
        assertThat(listedProducts.get(0).get("id")).isEqualTo(productId);
        assertThat(listedProducts.get(0).get("isActive")).isEqualTo(true);
        assertThat(listedProducts.get(0).get("stockQuantity")).isEqualTo(5);

        ApiTestClient.ApiTestResponse getResponse = api.get("/api/store/products/" + productId, adminHeaders);
        assertThat(getResponse.status()).isEqualTo(200);
        assertThat(getResponse.body().get("name")).isEqualTo("Cafe");

        ApiTestClient.ApiTestResponse updateResponse = api.putJson(
                "/api/store/products/" + productId,
                Map.of("sku", "SKU-1A", "name", "Cafe tostado", "priceCents", 1500, "stockQuantity", 2),
                adminHeaders
        );
        assertThat(updateResponse.status()).isEqualTo(200);
        assertThat(updateResponse.body().get("sku")).isEqualTo("SKU-1A");
        assertThat(updateResponse.body().get("name")).isEqualTo("Cafe tostado");
        assertThat(updateResponse.body().get("priceCents")).isEqualTo(1500);
        assertThat(updateResponse.body().get("stockQuantity")).isEqualTo(2);

        Product foreignProduct = productRepository.save(new Product(
                UUID.randomUUID(),
                otherStore.getId(),
                "SKU-OTHER",
                "Ajeno",
                999
        ));

        ApiTestClient.ApiTestResponse foreignGetResponse = api.get(
                "/api/store/products/" + foreignProduct.getId(),
                adminHeaders
        );
        assertThat(foreignGetResponse.status()).isEqualTo(404);
        assertThat(errorCodeOf(foreignGetResponse)).isEqualTo("product_not_found");

        ApiTestClient.ApiTestResponse foreignDeleteResponse = api.delete(
                "/api/store/products/" + productId,
                otherAdminHeaders
        );
        assertThat(foreignDeleteResponse.status()).isEqualTo(404);
        assertThat(errorCodeOf(foreignDeleteResponse)).isEqualTo("product_not_found");

        ApiTestClient.ApiTestResponse deleteResponse = api.delete("/api/store/products/" + productId, adminHeaders);
        assertThat(deleteResponse.status()).isEqualTo(200);
        assertThat(deleteResponse.body().get("isActive")).isEqualTo(false);
        assertThat(productRepository.findById(UUID.fromString(productId)).orElseThrow().isActive()).isFalse();

        List<Map<String, Object>> publicProducts = getList("/api/public/stores/" + slug1 + "/products", null);
        assertThat(publicProducts).isEmpty();

        ApiTestClient.ApiTestResponse checkoutInactiveResponse = api.postJson(
                "/api/store/checkout",
                Map.of("items", List.of(Map.of("productId", productId, "qty", 1))),
                api.storeHostHeaders(slug1)
        );
        assertThat(checkoutInactiveResponse.status()).isEqualTo(409);
        assertThat(errorCodeOf(checkoutInactiveResponse)).isEqualTo("product_inactive");
    }

    @Test
    void rejectsNegativeStockAndExposesUnavailableProductsPublicly() throws Exception {
        String slug = "store-stock-" + UUID.randomUUID();
        Store store = storeRepository.save(new Store(UUID.randomUUID(), slug, "Store Stock"));

        refreshTokenRepository.deleteAll();
        userRepository.deleteAll();
        storeMemberRepository.deleteAll();

        String adminEmail = "admin-" + UUID.randomUUID() + "@store.test";
        userRepository.save(new User(UUID.randomUUID(), adminEmail, passwordEncoder.encode("secret"), UserStatus.ACTIVE));
        storeMemberRepository.save(new StoreMember(UUID.randomUUID(), store.getId(), adminEmail, StoreMemberRole.ADMIN, StoreMemberStatus.ACTIVE));

        HttpHeaders adminHeaders = api.storeHostHeaders(slug);
        adminHeaders.setBearerAuth(loginAndGetAccessToken(adminEmail));

        ApiTestClient.ApiTestResponse invalidCreateResponse = api.postJson(
                "/api/store/products",
                Map.of("sku", "SKU-NEG", "name", "Invalido", "priceCents", 1000, "stockQuantity", -1),
                adminHeaders
        );
        assertThat(invalidCreateResponse.status()).isEqualTo(400);
        assertThat(errorCodeOf(invalidCreateResponse)).isEqualTo("invalid_stock_quantity");

        ApiTestClient.ApiTestResponse createResponse = api.postJson(
                "/api/store/products",
                Map.of("sku", "SKU-0", "name", "Sin stock", "priceCents", 1000, "stockQuantity", 0),
                adminHeaders
        );
        assertThat(createResponse.status()).isEqualTo(201);
        assertThat(createResponse.body().get("isAvailable")).isEqualTo(false);

        List<Map<String, Object>> publicProducts = getList("/api/public/stores/" + slug + "/products", null);
        assertThat(publicProducts).hasSize(1);
        assertThat(publicProducts.get(0).get("stockQuantity")).isEqualTo(0);
        assertThat(publicProducts.get(0).get("isAvailable")).isEqualTo(false);
    }

    @Test
    void publicCatalogSupportsSearchAvailabilityAndBasicSorting() throws Exception {
        String slug = "store-public-catalog-" + UUID.randomUUID();
        Store store = storeRepository.save(new Store(UUID.randomUUID(), slug, "Store Public Catalog"));

        productRepository.save(new Product(UUID.randomUUID(), store.getId(), "SKU-APPLE", "Apple", 1500, 8));
        productRepository.save(new Product(UUID.randomUUID(), store.getId(), "SKU-BANANA", "Banana", 900, 0));
        productRepository.save(new Product(UUID.randomUUID(), store.getId(), "SKU-CARROT", "Carrot", 1200, 3));

        List<Map<String, Object>> searchByName = getList("/api/public/stores/" + slug + "/products?q=app", null);
        assertThat(searchByName).hasSize(1);
        assertThat(searchByName.get(0).get("name")).isEqualTo("Apple");

        List<Map<String, Object>> searchBySku = getList("/api/public/stores/" + slug + "/products?q=banana", null);
        assertThat(searchBySku).hasSize(1);
        assertThat(searchBySku.get(0).get("sku")).isEqualTo("SKU-BANANA");

        List<Map<String, Object>> availableOnly = getList("/api/public/stores/" + slug + "/products?availableOnly=true", null);
        assertThat(availableOnly).extracting(item -> item.get("name")).containsExactly("Apple", "Carrot");
        assertThat(availableOnly).allMatch(item -> Boolean.TRUE.equals(item.get("isAvailable")));

        List<Map<String, Object>> sortByNameDesc = getList("/api/public/stores/" + slug + "/products?sort=name,desc", null);
        assertThat(sortByNameDesc).extracting(item -> item.get("name")).containsExactly("Carrot", "Banana", "Apple");

        List<Map<String, Object>> sortByPriceAsc = getList("/api/public/stores/" + slug + "/products?sort=price,asc", null);
        assertThat(sortByPriceAsc).extracting(item -> item.get("priceCents")).containsExactly(900, 1200, 1500);
    }

    @Test
    void adminCategoriesCanBeCreatedAssignedAndUsedForPublicFiltering() throws Exception {
        String slug = "store-categories-" + UUID.randomUUID();
        Store store = storeRepository.save(new Store(UUID.randomUUID(), slug, "Store Categories"));

        refreshTokenRepository.deleteAll();
        userRepository.deleteAll();
        storeMemberRepository.deleteAll();

        String adminEmail = "admin-" + UUID.randomUUID() + "@store.test";
        userRepository.save(new User(UUID.randomUUID(), adminEmail, passwordEncoder.encode("secret"), UserStatus.ACTIVE));
        storeMemberRepository.save(new StoreMember(UUID.randomUUID(), store.getId(), adminEmail, StoreMemberRole.ADMIN, StoreMemberStatus.ACTIVE));

        HttpHeaders adminHeaders = api.storeHostHeaders(slug);
        adminHeaders.setBearerAuth(loginAndGetAccessToken(adminEmail));

        ApiTestClient.ApiTestResponse createCategoryResponse = api.postJson(
                "/api/store/categories",
                Map.of("name", "Bebidas", "sortOrder", 10),
                adminHeaders
        );
        assertThat(createCategoryResponse.status()).isEqualTo(201);
        String categoryId = createCategoryResponse.body().get("id").toString();
        assertThat(createCategoryResponse.body().get("name")).isEqualTo("Bebidas");

        List<Map<String, Object>> categories = getList("/api/store/categories", adminHeaders);
        assertThat(categories).hasSize(1);
        assertThat(categories.get(0).get("active")).isEqualTo(true);

        ApiTestClient.ApiTestResponse createProductResponse = api.postJson(
                "/api/store/products",
                Map.of(
                        "sku", "SKU-CAFE",
                        "name", "Cafe tostado",
                        "priceCents", 1500,
                        "stockQuantity", 5,
                        "categoryId", categoryId
                ),
                adminHeaders
        );
        assertThat(createProductResponse.status()).isEqualTo(201);
        assertThat(createProductResponse.body().get("categoryId")).isEqualTo(categoryId);
        assertThat(createProductResponse.body().get("categoryName")).isEqualTo("Bebidas");

        ApiTestClient.ApiTestResponse storeResponse = api.get("/api/public/stores/" + slug, null);
        assertThat(storeResponse.status()).isEqualTo(200);
        List<Map<String, Object>> publicCategories = (List<Map<String, Object>>) storeResponse.body().get("categories");
        assertThat(publicCategories).hasSize(1);
        assertThat(publicCategories.get(0).get("name")).isEqualTo("Bebidas");

        List<Map<String, Object>> filteredProducts = getList("/api/public/stores/" + slug + "/products?categoryId=" + categoryId, null);
        assertThat(filteredProducts).hasSize(1);
        assertThat(filteredProducts.get(0).get("categoryName")).isEqualTo("Bebidas");

        ApiTestClient.ApiTestResponse deactivateCategoryResponse = api.patchJson(
                "/api/store/categories/" + categoryId + "/active",
                Map.of("active", false),
                adminHeaders
        );
        assertThat(deactivateCategoryResponse.status()).isEqualTo(200);
        assertThat(deactivateCategoryResponse.body().get("active")).isEqualTo(false);

        ApiTestClient.ApiTestResponse publicStoreAfterDeactivate = api.get("/api/public/stores/" + slug, null);
        List<Map<String, Object>> categoriesAfterDeactivate = (List<Map<String, Object>>) publicStoreAfterDeactivate.body().get("categories");
        assertThat(categoriesAfterDeactivate).isEmpty();

        List<Map<String, Object>> filteredAfterDeactivate = getList("/api/public/stores/" + slug + "/products?categoryId=" + categoryId, null);
        assertThat(filteredAfterDeactivate).isEmpty();

        StoreCategory category = storeCategoryRepository.findById(UUID.fromString(categoryId)).orElseThrow();
        assertThat(category.isActive()).isFalse();
    }

    @Test
    void publicStoreExposesOnlyActiveAndUsablePromotions() throws Exception {
        String slug = "store-public-promotions-" + UUID.randomUUID();
        Store store = storeRepository.save(new Store(UUID.randomUUID(), slug, "Store Public Promotions"));

        storePromotionRepository.save(new StorePromotion(
                UUID.randomUUID(),
                store.getId(),
                "BIENVENIDA10",
                StorePromotionType.PERCENTAGE,
                new java.math.BigDecimal("10.00"),
                true,
                Instant.now().plusSeconds(86400),
                10L
        ));
        storePromotionRepository.save(new StorePromotion(
                UUID.randomUUID(),
                store.getId(),
                "INACTIVA",
                StorePromotionType.FIXED,
                new java.math.BigDecimal("5.00"),
                false,
                Instant.now().plusSeconds(86400),
                10L
        ));
        storePromotionRepository.save(new StorePromotion(
                UUID.randomUUID(),
                store.getId(),
                "VENCIDA",
                StorePromotionType.FIXED,
                new java.math.BigDecimal("3.00"),
                true,
                Instant.now().minusSeconds(3600),
                10L
        ));

        ApiTestClient.ApiTestResponse response = api.get("/api/public/stores/" + slug, null);
        assertThat(response.status()).isEqualTo(200);
        assertThat(response.body().get("slug")).isEqualTo(slug);
        assertThat(response.body()).containsKey("promotions");

        List<Map<String, Object>> promotions = (List<Map<String, Object>>) response.body().get("promotions");
        assertThat(promotions).hasSize(1);
        assertThat(promotions.get(0).get("code")).isEqualTo("BIENVENIDA10");
        assertThat(promotions.get(0).get("shortLabel").toString()).contains("10% OFF");
    }

    private String loginAndGetAccessToken(String email) throws Exception {
        ApiTestClient.ApiTestResponse login = api.postJson(
                "/api/auth/login",
                Map.of("email", email, "password", "secret"),
                null
        );
        assertThat(login.status()).isEqualTo(200);
        return login.body().get("accessToken").toString();
    }

    private String errorCodeOf(ApiTestClient.ApiTestResponse response) {
        return ((Map<String, Object>) response.body().get("error")).get("code").toString();
    }

    private List<Map<String, Object>> readList(String rawBody) throws Exception {
        return MAPPER.readValue(rawBody, new TypeReference<>() {});
    }

    private List<Map<String, Object>> getList(String path, HttpHeaders headers) throws Exception {
        MvcResult result = mockMvc.perform(get(path).headers(headers == null ? new HttpHeaders() : headers)).andReturn();
        assertThat(result.getResponse().getStatus()).isEqualTo(200);
        return readList(result.getResponse().getContentAsString(StandardCharsets.UTF_8));
    }
}
