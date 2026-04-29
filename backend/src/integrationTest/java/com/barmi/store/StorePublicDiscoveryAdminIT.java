package com.barmi.store;

import com.barmi.domain.ecosystem.Ecosystem;
import com.barmi.domain.store.Store;
import com.barmi.domain.store.StoreMember;
import com.barmi.domain.store.StoreMemberRole;
import com.barmi.domain.store.StoreMemberStatus;
import com.barmi.domain.users.User;
import com.barmi.domain.users.UserStatus;
import com.barmi.infra.repo.EcosystemRepository;
import com.barmi.infra.repo.RefreshTokenRepository;
import com.barmi.infra.repo.StoreMemberRepository;
import com.barmi.infra.repo.StoreRepository;
import com.barmi.infra.repo.UserRepository;
import com.barmi.testsupport.ApiTestClient;
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
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@Testcontainers
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "jwt.secret=this_is_a_super_long_test_secret_key_that_is_at_least_32_bytes_long",
        "app.money.defaultCurrency=ARS",
        "app.security.allowDevIdentityHeader=true"
})
@org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
@TestConstructor(autowireMode = TestConstructor.AutowireMode.ALL)
@ActiveProfiles("integrationtest")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class StorePublicDiscoveryAdminIT {

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
    private final EcosystemRepository ecosystemRepository;
    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final ApiTestClient api;

    @Autowired
    StorePublicDiscoveryAdminIT(
            StoreRepository storeRepository,
            StoreMemberRepository storeMemberRepository,
            EcosystemRepository ecosystemRepository,
            UserRepository userRepository,
            RefreshTokenRepository refreshTokenRepository,
            PasswordEncoder passwordEncoder,
            org.springframework.test.web.servlet.MockMvc mockMvc
    ) {
        this.storeRepository = storeRepository;
        this.storeMemberRepository = storeMemberRepository;
        this.ecosystemRepository = ecosystemRepository;
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.api = new ApiTestClient(mockMvc);
    }

    @Test
    void ownerCanUpdateStorePublicDiscoverySettingsAndPublicEndpointsReflectTheChange() throws Exception {
        Store store = storeRepository.save(new Store(UUID.randomUUID(), "store-discovery-" + UUID.randomUUID(), "Store Discovery"));
        Ecosystem ecosystemA = ecosystemRepository.save(new Ecosystem(UUID.randomUUID(), "Eco Alpha", "eco-alpha-" + UUID.randomUUID()));
        Ecosystem ecosystemB = ecosystemRepository.save(new Ecosystem(UUID.randomUUID(), "Eco Beta", "eco-beta-" + UUID.randomUUID()));

        refreshTokenRepository.deleteAll();
        userRepository.deleteAll();
        storeMemberRepository.deleteAll();

        String ownerEmail = "owner-" + UUID.randomUUID() + "@store.test";
        userRepository.save(new User(UUID.randomUUID(), ownerEmail, passwordEncoder.encode("secret"), UserStatus.ACTIVE));
        storeMemberRepository.save(new StoreMember(UUID.randomUUID(), store.getId(), ownerEmail, StoreMemberRole.OWNER, StoreMemberStatus.ACTIVE));

        HttpHeaders ownerHeaders = api.storeHostHeaders(store.getSlug());
        ownerHeaders.setBearerAuth(loginAndGetAccessToken(ownerEmail));

        ApiTestClient.ApiTestResponse getResponse = api.get("/api/store/admin/discovery", ownerHeaders);
        assertThat(getResponse.status()).isEqualTo(200);
        assertThat(getResponse.body().get("actorRole")).isEqualTo("OWNER");
        List<Map<String, Object>> ecosystems = (List<Map<String, Object>>) getResponse.body().get("ecosystems");
        assertThat(ecosystems).extracting(item -> item.get("id"))
                .contains(ecosystemA.getId().toString(), ecosystemB.getId().toString());

        ApiTestClient.ApiTestResponse updateResponse = api.putJson(
                "/api/store/admin/discovery",
                Map.of(
                        "ecosystemId", ecosystemB.getId(),
                        "publicCategoryKey", "panaderia",
                        "publicLocationLabel", "Palermo Soho",
                        "publicLatitude", -34.58751,
                        "publicLongitude", -58.43072
                ),
                ownerHeaders
        );
        assertThat(updateResponse.status()).isEqualTo(200);
        assertThat(updateResponse.body().get("publicCategoryKey")).isEqualTo("panaderia");
        assertThat(((Map<String, Object>) updateResponse.body().get("ecosystem")).get("id")).isEqualTo(ecosystemB.getId().toString());

        Store saved = storeRepository.findById(store.getId()).orElseThrow();
        assertThat(saved.getEcosystem().getId()).isEqualTo(ecosystemB.getId());
        assertThat(saved.getPublicCategoryKey()).isEqualTo("panaderia");
        assertThat(saved.getPublicLocationLabel()).isEqualTo("Palermo Soho");
        assertThat(saved.getPublicLatitude()).isEqualByComparingTo(new BigDecimal("-34.58751"));
        assertThat(saved.getPublicLongitude()).isEqualByComparingTo(new BigDecimal("-58.43072"));

        ApiTestClient.ApiTestResponse publicMap = api.get("/api/public/ecosystems/" + ecosystemB.getSlug() + "/stores/map?category=panaderia&location=all", null);
        assertThat(publicMap.status()).isEqualTo(200);
        List<Map<String, Object>> stores = (List<Map<String, Object>>) publicMap.body().get("stores");
        assertThat(stores).hasSize(1);
        assertThat(stores.get(0).get("slug")).isEqualTo(store.getSlug());
        assertThat(((Map<String, Object>) stores.get(0).get("category")).get("key")).isEqualTo("panaderia");

        ApiTestClient.ApiTestResponse home = api.get("/api/public/ecosystems/" + ecosystemB.getSlug() + "/home", null);
        assertThat(home.status()).isEqualTo(200);
        List<Map<String, Object>> newStores = (List<Map<String, Object>>) home.body().get("newStores");
        assertThat(newStores).extracting(item -> item.get("slug")).contains(store.getSlug());
    }

    @Test
    void rejectsInvalidDiscoveryInputsAndRequiresOwnerForUpdate() throws Exception {
        Store store = storeRepository.save(new Store(UUID.randomUUID(), "store-discovery-" + UUID.randomUUID(), "Store Discovery"));
        Ecosystem ecosystem = ecosystemRepository.save(new Ecosystem(UUID.randomUUID(), "Eco Alpha", "eco-alpha-" + UUID.randomUUID()));

        refreshTokenRepository.deleteAll();
        userRepository.deleteAll();
        storeMemberRepository.deleteAll();

        String ownerEmail = "owner-" + UUID.randomUUID() + "@store.test";
        String adminEmail = "admin-" + UUID.randomUUID() + "@store.test";
        userRepository.save(new User(UUID.randomUUID(), ownerEmail, passwordEncoder.encode("secret"), UserStatus.ACTIVE));
        userRepository.save(new User(UUID.randomUUID(), adminEmail, passwordEncoder.encode("secret"), UserStatus.ACTIVE));
        storeMemberRepository.save(new StoreMember(UUID.randomUUID(), store.getId(), ownerEmail, StoreMemberRole.OWNER, StoreMemberStatus.ACTIVE));
        storeMemberRepository.save(new StoreMember(UUID.randomUUID(), store.getId(), adminEmail, StoreMemberRole.ADMIN, StoreMemberStatus.ACTIVE));

        HttpHeaders ownerHeaders = api.storeHostHeaders(store.getSlug());
        ownerHeaders.setBearerAuth(loginAndGetAccessToken(ownerEmail));
        HttpHeaders adminHeaders = api.storeHostHeaders(store.getSlug());
        adminHeaders.setBearerAuth(loginAndGetAccessToken(adminEmail));

        ApiTestClient.ApiTestResponse forbidden = api.putJson(
                "/api/store/admin/discovery",
                Map.of("ecosystemId", ecosystem.getId()),
                adminHeaders
        );
        assertThat(forbidden.status()).isEqualTo(403);
        assertThat(errorCode(forbidden)).isEqualTo("forbidden");

        ApiTestClient.ApiTestResponse invalidEcosystem = api.putJson(
                "/api/store/admin/discovery",
                Map.of("ecosystemId", UUID.randomUUID()),
                ownerHeaders
        );
        assertThat(invalidEcosystem.status()).isEqualTo(400);
        assertThat(errorCode(invalidEcosystem)).isEqualTo("invalid_ecosystem_id");

        ApiTestClient.ApiTestResponse invalidCategory = api.putJson(
                "/api/store/admin/discovery",
                Map.of("publicCategoryKey", "categoria-inexistente"),
                ownerHeaders
        );
        assertThat(invalidCategory.status()).isEqualTo(400);
        assertThat(errorCode(invalidCategory)).isEqualTo("invalid_public_category_key");

        ApiTestClient.ApiTestResponse invalidCoordinates = api.putJson(
                "/api/store/admin/discovery",
                Map.of(
                        "publicLocationLabel", "",
                        "publicLatitude", -34.0,
                        "publicLongitude", -58.0
                ),
                ownerHeaders
        );
        assertThat(invalidCoordinates.status()).isEqualTo(400);
        assertThat(errorCode(invalidCoordinates)).isEqualTo("public_location_label_required");
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

    private String errorCode(ApiTestClient.ApiTestResponse response) {
        return ((Map<String, Object>) response.body().get("error")).get("code").toString();
    }
}
