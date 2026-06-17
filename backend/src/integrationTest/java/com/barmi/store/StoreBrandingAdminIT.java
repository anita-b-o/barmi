package com.barmi.store;

import com.barmi.PostgresIntegrationTestBase;
import com.barmi.domain.store.Store;
import com.barmi.domain.store.StoreMember;
import com.barmi.domain.store.StoreMemberRole;
import com.barmi.domain.store.StoreMemberStatus;
import com.barmi.domain.users.User;
import com.barmi.domain.users.UserStatus;
import com.barmi.infra.repo.StoreMemberRepository;
import com.barmi.infra.repo.StoreRepository;
import com.barmi.infra.repo.UserRepository;
import com.barmi.testsupport.ApiTestClient;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@Testcontainers
@AutoConfigureMockMvc
class StoreBrandingAdminIT extends PostgresIntegrationTestBase {
    private final ApiTestClient api;
    private final StoreRepository storeRepository;
    private final StoreMemberRepository storeMemberRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JdbcTemplate jdbcTemplate;

    private Store store;
    private Store otherStore;
    private String ownerEmail;
    private String adminEmail;
    private String staffEmail;

    @Autowired
    StoreBrandingAdminIT(
            MockMvc mockMvc,
            StoreRepository storeRepository,
            StoreMemberRepository storeMemberRepository,
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JdbcTemplate jdbcTemplate
    ) {
        this.api = new ApiTestClient(mockMvc);
        this.storeRepository = storeRepository;
        this.storeMemberRepository = storeMemberRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jdbcTemplate = jdbcTemplate;
    }

    @BeforeEach
    void setup() {
        truncateAllTables(jdbcTemplate);
        store = storeRepository.save(new Store(UUID.randomUUID(), "branding-" + UUID.randomUUID(), "Branding Store"));
        otherStore = storeRepository.save(new Store(UUID.randomUUID(), "branding-other-" + UUID.randomUUID(), "Other Branding Store"));
        ownerEmail = "owner-" + UUID.randomUUID() + "@example.com";
        adminEmail = "admin-" + UUID.randomUUID() + "@example.com";
        staffEmail = "staff-" + UUID.randomUUID() + "@example.com";
        createUserAndMembership(store, ownerEmail, StoreMemberRole.OWNER);
        createUserAndMembership(store, adminEmail, StoreMemberRole.ADMIN);
        createUserAndMembership(store, staffEmail, StoreMemberRole.STAFF);
    }

    @Test
    void newStoresExposeDefaultBranding() throws Exception {
        ApiTestClient.ApiTestResponse response = api.get("/api/store/branding", authHeaders(store, ownerEmail));

        assertThat(response.status()).isEqualTo(200);
        assertThat(response.body().get("logoUrl")).isNull();
        assertThat(response.body().get("bannerUrl")).isNull();
        assertThat(response.body().get("primaryColor")).isEqualTo(Store.DEFAULT_PRIMARY_COLOR);
        assertThat(response.body().get("secondaryColor")).isEqualTo(Store.DEFAULT_SECONDARY_COLOR);
    }

    @Test
    void ownerAndAdminCanReadAndUpdateBrandingForCurrentStoreOnly() throws Exception {
        ApiTestClient.ApiTestResponse ownerGet = api.get("/api/store/branding", authHeaders(store, ownerEmail));
        assertThat(ownerGet.status()).isEqualTo(200);

        ApiTestClient.ApiTestResponse update = api.putJson(
                "/api/store/branding",
                Map.of(
                        "logoUrl", " https://cdn.example.test/logo.png ",
                        "bannerUrl", "https://cdn.example.test/banner.jpg",
                        "primaryColor", "#0f766e",
                        "secondaryColor", "#155e75"
                ),
                authHeaders(store, adminEmail)
        );

        assertThat(update.status()).isEqualTo(200);
        assertThat(update.body().get("logoUrl")).isEqualTo("https://cdn.example.test/logo.png");
        assertThat(update.body().get("bannerUrl")).isEqualTo("https://cdn.example.test/banner.jpg");
        assertThat(update.body().get("primaryColor")).isEqualTo("#0F766E");
        assertThat(update.body().get("secondaryColor")).isEqualTo("#155E75");

        Store saved = storeRepository.findById(store.getId()).orElseThrow();
        Store untouched = storeRepository.findById(otherStore.getId()).orElseThrow();
        assertThat(saved.getLogoUrl()).isEqualTo("https://cdn.example.test/logo.png");
        assertThat(saved.getPrimaryColor()).isEqualTo("#0F766E");
        assertThat(untouched.getLogoUrl()).isNull();
        assertThat(untouched.getPrimaryColor()).isEqualTo(Store.DEFAULT_PRIMARY_COLOR);
    }

    @Test
    void rejectsInvalidColorsLongUrlsAndStaff() throws Exception {
        ApiTestClient.ApiTestResponse invalidPrimary = api.putJson(
                "/api/store/branding",
                Map.of("primaryColor", "red", "secondaryColor", Store.DEFAULT_SECONDARY_COLOR),
                authHeaders(store, ownerEmail)
        );
        ApiTestClient.ApiTestResponse invalidSecondary = api.putJson(
                "/api/store/branding",
                Map.of("primaryColor", Store.DEFAULT_PRIMARY_COLOR, "secondaryColor", "#12345G"),
                authHeaders(store, ownerEmail)
        );
        ApiTestClient.ApiTestResponse tooLongUrl = api.putJson(
                "/api/store/branding",
                Map.of("logoUrl", "a".repeat(501)),
                authHeaders(store, ownerEmail)
        );
        ApiTestClient.ApiTestResponse staffGet = api.get("/api/store/branding", authHeaders(store, staffEmail));
        ApiTestClient.ApiTestResponse staffPut = api.putJson(
                "/api/store/branding",
                Map.of("primaryColor", "#111111", "secondaryColor", "#222222"),
                authHeaders(store, staffEmail)
        );

        assertThat(invalidPrimary.status()).isEqualTo(400);
        assertThat(errorCode(invalidPrimary)).isEqualTo("invalid_primary_color");
        assertThat(invalidSecondary.status()).isEqualTo(400);
        assertThat(errorCode(invalidSecondary)).isEqualTo("invalid_secondary_color");
        assertThat(tooLongUrl.status()).isEqualTo(400);
        assertThat(errorCode(tooLongUrl)).isEqualTo("logo_url_too_long");
        assertThat(staffGet.status()).isEqualTo(403);
        assertThat(staffPut.status()).isEqualTo(403);
    }

    @Test
    void publicStorePayloadIncludesBrandingForRequestedStoreOnly() throws Exception {
        api.putJson(
                "/api/store/branding",
                Map.of(
                        "logoUrl", "https://cdn.example.test/logo.svg",
                        "bannerUrl", "https://cdn.example.test/banner.png",
                        "primaryColor", "#7C3AED",
                        "secondaryColor", "#6D28D9"
                ),
                authHeaders(store, ownerEmail)
        );

        ApiTestClient.ApiTestResponse publicStore = api.get("/api/public/stores/" + store.getSlug(), null);

        assertThat(publicStore.status()).isEqualTo(200);
        Map<String, Object> branding = (Map<String, Object>) publicStore.body().get("branding");
        assertThat(branding.get("logoUrl")).isEqualTo("https://cdn.example.test/logo.svg");
        assertThat(branding.get("bannerUrl")).isEqualTo("https://cdn.example.test/banner.png");
        assertThat(branding.get("primaryColor")).isEqualTo("#7C3AED");
        assertThat(branding.get("secondaryColor")).isEqualTo("#6D28D9");
        assertThat(publicStore.rawBody()).doesNotContain(otherStore.getId().toString());
    }

    private void createUserAndMembership(Store targetStore, String email, StoreMemberRole role) {
        userRepository.save(new User(UUID.randomUUID(), email, passwordEncoder.encode("secret"), UserStatus.ACTIVE));
        storeMemberRepository.save(new StoreMember(UUID.randomUUID(), targetStore.getId(), email, role, StoreMemberStatus.ACTIVE));
    }

    private HttpHeaders authHeaders(Store targetStore, String email) throws Exception {
        HttpHeaders headers = api.storeHostHeaders(targetStore.getSlug());
        headers.setBearerAuth(loginAndGetAccessToken(email));
        return headers;
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
