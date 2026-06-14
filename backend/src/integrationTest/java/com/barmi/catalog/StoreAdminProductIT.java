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
import org.springframework.test.util.ReflectionTestUtils;
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

        Product apple = productRepository.save(new Product(UUID.randomUUID(), store.getId(), "SKU-APPLE", "Apple", 1500, 8));
        productRepository.save(new Product(UUID.randomUUID(), store.getId(), "SKU-BANANA", "Banana", 900, 0));
        productRepository.save(new Product(UUID.randomUUID(), store.getId(), "SKU-CARROT", "Carrot", 1200, 3));

        List<Map<String, Object>> searchByName = getList("/api/public/stores/" + slug + "/products?q=app", null);
        assertThat(searchByName).hasSize(1);
        assertThat(searchByName.get(0).get("name")).isEqualTo("Apple");
        assertThat(searchByName.get(0).get("slug")).isEqualTo(apple.getPublicSlug());
        assertThat(searchByName.get(0)).doesNotContainKeys("storeId");

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
    void publicCatalogKeepsLegacyArrayResponseWithoutPaginationParams() throws Exception {
        String slug = "store-public-catalog-legacy-" + UUID.randomUUID();
        Store store = storeRepository.save(new Store(UUID.randomUUID(), slug, "Store Public Catalog Legacy"));

        Product product = productRepository.save(new Product(UUID.randomUUID(), store.getId(), "SKU-APPLE", "Apple", 1500, 8));

        MvcResult result = mockMvc.perform(get("/api/public/stores/" + slug + "/products")).andReturn();
        assertThat(result.getResponse().getStatus()).isEqualTo(200);
        String body = result.getResponse().getContentAsString(StandardCharsets.UTF_8);
        assertThat(body.trim()).startsWith("[");
        assertThat(body).doesNotContain("totalElements");

        List<Map<String, Object>> products = readList(body);
        assertThat(products).hasSize(1);
        assertThat(products.get(0).get("name")).isEqualTo("Apple");
        assertThat(products.get(0).get("slug")).isEqualTo(product.getPublicSlug());
        assertThat(products.get(0)).doesNotContainKeys("storeId");
    }

    @Test
    void publicCatalogSupportsOptInPaginationShapeAndFiltering() throws Exception {
        String slug = "store-public-catalog-page-" + UUID.randomUUID();
        Store store = storeRepository.save(new Store(UUID.randomUUID(), slug, "Store Public Catalog Page"));

        productRepository.save(new Product(UUID.randomUUID(), store.getId(), "SKU-APPLE-1", "Apple one", 1500, 8));
        Product appleTwo = productRepository.save(new Product(UUID.randomUUID(), store.getId(), "SKU-APPLE-2", "Apple two", 1200, 2));
        productRepository.save(new Product(UUID.randomUUID(), store.getId(), "SKU-BANANA", "Banana", 900, 5));

        ApiTestClient.ApiTestResponse response = api.get(
                "/api/public/stores/" + slug + "/products?q=apple&page=0&size=1&sort=price,asc",
                null
        );

        assertThat(response.status()).isEqualTo(200);
        assertThat(response.body().get("page")).isEqualTo(0);
        assertThat(response.body().get("size")).isEqualTo(1);
        assertThat(response.body().get("totalElements")).isEqualTo(2);
        assertThat(response.body().get("totalPages")).isEqualTo(2);
        List<Map<String, Object>> content = (List<Map<String, Object>>) response.body().get("content");
        assertThat(content).hasSize(1);
        assertThat(content.get(0).get("name")).isEqualTo("Apple two");
        assertThat(content.get(0).get("slug")).isEqualTo(appleTwo.getPublicSlug());
        assertThat(content.get(0).get("priceCents")).isEqualTo(1200);
        assertThat(content.get(0)).doesNotContainKeys("storeId");
    }

    @Test
    void publicCatalogPaginatesAfterCategoryAndAvailabilityFilters() throws Exception {
        String slug = "store-public-catalog-category-page-" + UUID.randomUUID();
        Store store = storeRepository.save(new Store(UUID.randomUUID(), slug, "Store Public Catalog Category Page"));
        StoreCategory bebidas = storeCategoryRepository.save(new StoreCategory(UUID.randomUUID(), store.getId(), "Bebidas", true, 10));
        StoreCategory snacks = storeCategoryRepository.save(new StoreCategory(UUID.randomUUID(), store.getId(), "Snacks", true, 20));

        productRepository.save(new Product(UUID.randomUUID(), store.getId(), "SKU-CAFE", "Cafe", 1500, 4, bebidas.getId()));
        productRepository.save(new Product(UUID.randomUUID(), store.getId(), "SKU-TE", "Te", 900, 0, bebidas.getId()));
        productRepository.save(new Product(UUID.randomUUID(), store.getId(), "SKU-PAPAS", "Papas", 700, 6, snacks.getId()));

        ApiTestClient.ApiTestResponse response = api.get(
                "/api/public/stores/" + slug + "/products?categoryId=" + bebidas.getId() + "&availableOnly=true&page=0&size=10",
                null
        );

        assertThat(response.status()).isEqualTo(200);
        assertThat(response.body().get("totalElements")).isEqualTo(1);
        assertThat(response.body().get("totalPages")).isEqualTo(1);
        List<Map<String, Object>> content = (List<Map<String, Object>>) response.body().get("content");
        assertThat(content).hasSize(1);
        assertThat(content.get(0).get("name")).isEqualTo("Cafe");
        assertThat(content.get(0).get("categoryId")).isEqualTo(bebidas.getId().toString());
    }

    @Test
    void publicCatalogReturnsEmptyContentForOutOfRangePage() throws Exception {
        String slug = "store-public-catalog-empty-page-" + UUID.randomUUID();
        Store store = storeRepository.save(new Store(UUID.randomUUID(), slug, "Store Public Catalog Empty Page"));

        productRepository.save(new Product(UUID.randomUUID(), store.getId(), "SKU-APPLE", "Apple", 1500, 8));

        ApiTestClient.ApiTestResponse response = api.get(
                "/api/public/stores/" + slug + "/products?page=5&size=2",
                null
        );

        assertThat(response.status()).isEqualTo(200);
        assertThat(response.body().get("page")).isEqualTo(5);
        assertThat(response.body().get("size")).isEqualTo(2);
        assertThat(response.body().get("totalElements")).isEqualTo(1);
        assertThat(response.body().get("totalPages")).isEqualTo(1);
        assertThat((List<Map<String, Object>>) response.body().get("content")).isEmpty();
    }

    @Test
    void publicCatalogCapsPageSizeAndRejectsInvalidPaginationParams() throws Exception {
        String slug = "store-public-catalog-page-limits-" + UUID.randomUUID();
        Store store = storeRepository.save(new Store(UUID.randomUUID(), slug, "Store Public Catalog Page Limits"));

        productRepository.save(new Product(UUID.randomUUID(), store.getId(), "SKU-APPLE", "Apple", 1500, 8));

        ApiTestClient.ApiTestResponse cappedResponse = api.get(
                "/api/public/stores/" + slug + "/products?page=0&size=500",
                null
        );
        assertThat(cappedResponse.status()).isEqualTo(200);
        assertThat(cappedResponse.body().get("size")).isEqualTo(100);
        assertThat(cappedResponse.body().get("totalElements")).isEqualTo(1);

        assertThat(api.get("/api/public/stores/" + slug + "/products?page=-1&size=20", null).status()).isEqualTo(400);
        assertThat(api.get("/api/public/stores/" + slug + "/products?page=0&size=0", null).status()).isEqualTo(400);
    }

    @Test
    void publicCatalogKeepsStableOrderingAcrossPages() throws Exception {
        String slug = "store-public-catalog-stable-page-" + UUID.randomUUID();
        Store store = storeRepository.save(new Store(UUID.randomUUID(), slug, "Store Public Catalog Stable Page"));

        UUID firstId = UUID.fromString("00000000-0000-0000-0000-000000000001");
        UUID secondId = UUID.fromString("00000000-0000-0000-0000-000000000002");
        UUID thirdId = UUID.fromString("00000000-0000-0000-0000-000000000003");
        productRepository.save(new Product(thirdId, store.getId(), "SKU-C", "Same", 1000, 3));
        productRepository.save(new Product(firstId, store.getId(), "SKU-A", "Same", 1000, 3));
        productRepository.save(new Product(secondId, store.getId(), "SKU-B", "Same", 1000, 3));

        ApiTestClient.ApiTestResponse firstPage = api.get(
                "/api/public/stores/" + slug + "/products?sort=name,asc&page=0&size=2",
                null
        );
        ApiTestClient.ApiTestResponse secondPage = api.get(
                "/api/public/stores/" + slug + "/products?sort=name,asc&page=1&size=2",
                null
        );

        assertThat(firstPage.status()).isEqualTo(200);
        assertThat(secondPage.status()).isEqualTo(200);
        List<Map<String, Object>> firstContent = (List<Map<String, Object>>) firstPage.body().get("content");
        List<Map<String, Object>> secondContent = (List<Map<String, Object>>) secondPage.body().get("content");
        assertThat(firstContent).hasSize(2);
        assertThat(secondContent).hasSize(1);
        assertThat(firstContent).extracting(item -> item.get("id"))
                .doesNotContain(secondContent.get(0).get("id"));
        assertThat(firstPage.body().get("totalElements")).isEqualTo(3);
        assertThat(secondPage.body().get("totalElements")).isEqualTo(3);
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
    void publicProductDetailReturnsSeoSafeContractForActiveProducts() throws Exception {
        String slug = "store-public-product-detail-" + UUID.randomUUID();
        Store store = new Store(UUID.randomUUID(), slug, "Store Product Detail");
        store.updatePublicCategoryKey("panaderia");
        storeRepository.save(store);
        StoreCategory category = storeCategoryRepository.save(new StoreCategory(UUID.randomUUID(), store.getId(), "Bebidas", true, 10));
        Product product = productRepository.save(new Product(UUID.randomUUID(), store.getId(), "SKU-APPLE", "Apple", 1500, 8, category.getId()));

        ApiTestClient.ApiTestResponse response = api.get(
                "/api/public/stores/" + slug + "/products/" + product.getPublicSlug(),
                null
        );

        assertThat(response.status()).isEqualTo(200);
        Map<String, Object> storePayload = (Map<String, Object>) response.body().get("store");
        Map<String, Object> productPayload = (Map<String, Object>) response.body().get("product");
        assertThat(storePayload).containsEntry("slug", slug);
        assertThat(storePayload).containsEntry("name", "Store Product Detail");
        assertThat(storePayload).containsEntry("categoryName", "Panaderia");
        assertThat(storePayload).doesNotContainKeys("id", "storeId");
        assertThat(productPayload).containsEntry("slug", product.getPublicSlug());
        assertThat(productPayload).containsEntry("name", "Apple");
        assertThat(productPayload).containsEntry("priceCents", 1500);
        assertThat(productPayload).containsEntry("currency", "ARS");
        assertThat(productPayload).containsEntry("isAvailable", true);
        assertThat(productPayload).containsEntry("stockQuantity", 8);
        assertThat(productPayload).containsEntry("categoryName", "Bebidas");
        assertThat(productPayload).containsEntry("description", null);
        assertThat(productPayload).containsEntry("imageUrl", null);
        assertThat(productPayload).containsEntry("sku", "SKU-APPLE");
        assertThat(productPayload).doesNotContainKeys("id", "storeId", "categoryId");
        assertThat(response.rawBody()).doesNotContain(product.getId().toString());
        assertThat(response.rawBody()).doesNotContain(store.getId().toString());
        assertThat(response.rawBody()).doesNotContain(category.getId().toString());
    }

    @Test
    void publicProductDetailReturnsUnavailableProductWhenActiveButOutOfStock() throws Exception {
        String slug = "store-public-product-out-stock-" + UUID.randomUUID();
        Store store = storeRepository.save(new Store(UUID.randomUUID(), slug, "Store Product Out Stock"));
        Product product = productRepository.save(new Product(UUID.randomUUID(), store.getId(), "SKU-0", "Sin stock", 1000, 0));

        ApiTestClient.ApiTestResponse response = api.get(
                "/api/public/stores/" + slug + "/products/" + product.getPublicSlug(),
                null
        );

        assertThat(response.status()).isEqualTo(200);
        Map<String, Object> productPayload = (Map<String, Object>) response.body().get("product");
        assertThat(productPayload).containsEntry("isAvailable", false);
        assertThat(productPayload).containsEntry("stockQuantity", 0);
    }

    @Test
    void publicProductDetailReturnsNotFoundForMissingInactiveOrForeignResources() throws Exception {
        String slug = "store-public-product-404-" + UUID.randomUUID();
        String otherSlug = "store-public-product-other-" + UUID.randomUUID();
        String inactiveSlug = "store-public-product-inactive-store-" + UUID.randomUUID();
        Store store = storeRepository.save(new Store(UUID.randomUUID(), slug, "Store Product 404"));
        Store otherStore = storeRepository.save(new Store(UUID.randomUUID(), otherSlug, "Store Product Other"));
        Store inactiveStore = storeRepository.save(new Store(UUID.randomUUID(), inactiveSlug, "Inactive Store Product"));
        ReflectionTestUtils.setField(inactiveStore, "active", false);
        storeRepository.save(inactiveStore);

        Product activeProduct = productRepository.save(new Product(UUID.randomUUID(), store.getId(), "SKU-ACTIVE", "Active", 1500, 8));
        Product inactiveProduct = productRepository.save(new Product(UUID.randomUUID(), store.getId(), "SKU-INACTIVE", "Inactive", 1500, 8));
        inactiveProduct.setActive(false);
        productRepository.save(inactiveProduct);
        Product foreignProduct = productRepository.save(new Product(UUID.randomUUID(), otherStore.getId(), "SKU-FOREIGN", "Foreign", 1500, 8));

        assertThat(api.get("/api/public/stores/missing-store/products/" + activeProduct.getPublicSlug(), null).status()).isEqualTo(404);
        assertThat(api.get("/api/public/stores/" + inactiveSlug + "/products/" + activeProduct.getPublicSlug(), null).status()).isEqualTo(404);
        assertThat(api.get("/api/public/stores/" + slug + "/products/missing-product", null).status()).isEqualTo(404);
        assertThat(api.get("/api/public/stores/" + slug + "/products/" + inactiveProduct.getPublicSlug(), null).status()).isEqualTo(404);
        assertThat(api.get("/api/public/stores/" + slug + "/products/" + foreignProduct.getPublicSlug(), null).status()).isEqualTo(404);
    }

    @Test
    void publicProductDetailHidesInactiveCategoryName() throws Exception {
        String slug = "store-public-product-inactive-category-" + UUID.randomUUID();
        Store store = storeRepository.save(new Store(UUID.randomUUID(), slug, "Store Product Inactive Category"));
        StoreCategory category = storeCategoryRepository.save(new StoreCategory(UUID.randomUUID(), store.getId(), "Bebidas", false, 10));
        Product product = productRepository.save(new Product(UUID.randomUUID(), store.getId(), "SKU-CAT", "Cafe", 1500, 8, category.getId()));

        ApiTestClient.ApiTestResponse response = api.get(
                "/api/public/stores/" + slug + "/products/" + product.getPublicSlug(),
                null
        );

        assertThat(response.status()).isEqualTo(200);
        Map<String, Object> productPayload = (Map<String, Object>) response.body().get("product");
        assertThat(productPayload).containsEntry("categoryName", null);
        assertThat(productPayload).doesNotContainKeys("categoryId");
    }

    @Test
    void productPublicSlugsAreUniqueWithinStoreWhenNamesCollide() {
        Store store = storeRepository.save(new Store(UUID.randomUUID(), "store-public-slugs-" + UUID.randomUUID(), "Store Public Slugs"));
        Product first = productRepository.save(new Product(UUID.randomUUID(), store.getId(), "SKU-A", "Same product", 1000, 3));
        Product second = productRepository.save(new Product(UUID.randomUUID(), store.getId(), "SKU-B", "Same product", 1200, 4));

        assertThat(first.getPublicSlug()).startsWith("same-product");
        assertThat(second.getPublicSlug()).startsWith("same-product");
        assertThat(first.getPublicSlug()).isNotEqualTo(second.getPublicSlug());
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
