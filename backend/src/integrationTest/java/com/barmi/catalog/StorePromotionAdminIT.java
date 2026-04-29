package com.barmi.catalog;

import com.barmi.domain.store.Store;
import com.barmi.domain.store.StoreMember;
import com.barmi.domain.store.StoreMemberRole;
import com.barmi.domain.store.StoreMemberStatus;
import com.barmi.domain.users.User;
import com.barmi.domain.users.UserStatus;
import com.barmi.infra.repo.RefreshTokenRepository;
import com.barmi.infra.repo.StoreMemberRepository;
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
class StorePromotionAdminIT {

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
    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final MockMvc mockMvc;
    private final ApiTestClient api;

    @Autowired
    StorePromotionAdminIT(
            StoreRepository storeRepository,
            StoreMemberRepository storeMemberRepository,
            UserRepository userRepository,
            RefreshTokenRepository refreshTokenRepository,
            PasswordEncoder passwordEncoder,
            MockMvc mockMvc
    ) {
        this.storeRepository = storeRepository;
        this.storeMemberRepository = storeMemberRepository;
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.mockMvc = mockMvc;
        this.api = new ApiTestClient(mockMvc);
    }

    @Test
    void adminCanCreateListAndTogglePromotionsWithinStoreScope() throws Exception {
        String slug = "store-promotions-" + UUID.randomUUID();
        String otherSlug = "store-promotions-other-" + UUID.randomUUID();
        Store store = storeRepository.save(new Store(UUID.randomUUID(), slug, "Store Promotions"));
        Store otherStore = storeRepository.save(new Store(UUID.randomUUID(), otherSlug, "Store Promotions Other"));

        refreshTokenRepository.deleteAll();
        userRepository.deleteAll();
        storeMemberRepository.deleteAll();

        String adminEmail = "admin-" + UUID.randomUUID() + "@store.test";
        String otherAdminEmail = "admin-" + UUID.randomUUID() + "@other.test";
        userRepository.save(new User(UUID.randomUUID(), adminEmail, passwordEncoder.encode("secret"), UserStatus.ACTIVE));
        userRepository.save(new User(UUID.randomUUID(), otherAdminEmail, passwordEncoder.encode("secret"), UserStatus.ACTIVE));
        storeMemberRepository.save(new StoreMember(UUID.randomUUID(), store.getId(), adminEmail, StoreMemberRole.ADMIN, StoreMemberStatus.ACTIVE));
        storeMemberRepository.save(new StoreMember(UUID.randomUUID(), otherStore.getId(), otherAdminEmail, StoreMemberRole.ADMIN, StoreMemberStatus.ACTIVE));

        HttpHeaders adminHeaders = api.storeHostHeaders(slug);
        adminHeaders.setBearerAuth(loginAndGetAccessToken(adminEmail));
        HttpHeaders otherAdminHeaders = api.storeHostHeaders(otherSlug);
        otherAdminHeaders.setBearerAuth(loginAndGetAccessToken(otherAdminEmail));

        ApiTestClient.ApiTestResponse createResponse = api.postJson(
                "/api/store/promotions",
                Map.of(
                        "code", "bienvenida10",
                        "type", "PERCENTAGE",
                        "value", 10,
                        "active", true,
                        "usageLimit", 5
                ),
                adminHeaders
        );

        assertThat(createResponse.status()).isEqualTo(201);
        assertThat(createResponse.body().get("code")).isEqualTo("BIENVENIDA10");
        assertThat(createResponse.body().get("type")).isEqualTo("PERCENTAGE");
        assertThat(createResponse.body().get("active")).isEqualTo(true);

        String promotionId = createResponse.body().get("id").toString();

        List<Map<String, Object>> promotions = getList("/api/store/promotions", adminHeaders);
        assertThat(promotions).hasSize(1);
        assertThat(promotions.get(0).get("code")).isEqualTo("BIENVENIDA10");

        ApiTestClient.ApiTestResponse toggleResponse = api.patchJson(
                "/api/store/promotions/" + promotionId + "/active",
                Map.of("active", false),
                adminHeaders
        );
        assertThat(toggleResponse.status()).isEqualTo(200);
        assertThat(toggleResponse.body().get("active")).isEqualTo(false);

        ApiTestClient.ApiTestResponse foreignToggleResponse = api.patchJson(
                "/api/store/promotions/" + promotionId + "/active",
                Map.of("active", true),
                otherAdminHeaders
        );
        assertThat(foreignToggleResponse.status()).isEqualTo(404);
        assertThat(errorCodeOf(foreignToggleResponse)).isEqualTo("promotion_not_found");
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

    private List<Map<String, Object>> getList(String path, HttpHeaders headers) throws Exception {
        MvcResult result = mockMvc.perform(get(path).headers(headers)).andReturn();
        assertThat(result.getResponse().getStatus()).isEqualTo(200);
        return MAPPER.readValue(result.getResponse().getContentAsString(StandardCharsets.UTF_8), new TypeReference<>() {});
    }
}
