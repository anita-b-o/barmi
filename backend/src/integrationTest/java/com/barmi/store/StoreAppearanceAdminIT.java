package com.barmi.store;

import com.barmi.PostgresIntegrationTestBase;
import com.barmi.domain.store.Store;
import com.barmi.domain.store.StoreAppearancePalette;
import com.barmi.domain.store.StoreAppearancePreset;
import com.barmi.domain.store.StoreAppearanceShape;
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
class StoreAppearanceAdminIT extends PostgresIntegrationTestBase {
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
    StoreAppearanceAdminIT(
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
        store = storeRepository.save(new Store(UUID.randomUUID(), "appearance-" + UUID.randomUUID(), "Appearance Store"));
        otherStore = storeRepository.save(new Store(UUID.randomUUID(), "appearance-other-" + UUID.randomUUID(), "Other Appearance Store"));
        ownerEmail = "owner-" + UUID.randomUUID() + "@example.com";
        adminEmail = "admin-" + UUID.randomUUID() + "@example.com";
        staffEmail = "staff-" + UUID.randomUUID() + "@example.com";
        createUserAndMembership(store, ownerEmail, StoreMemberRole.OWNER);
        createUserAndMembership(store, adminEmail, StoreMemberRole.ADMIN);
        createUserAndMembership(store, staffEmail, StoreMemberRole.STAFF);
    }

    @Test
    void newStoresDefaultToModern() throws Exception {
        Store saved = storeRepository.findById(store.getId()).orElseThrow();
        assertThat(saved.getAppearancePreset()).isEqualTo(StoreAppearancePreset.MODERN);
        assertThat(saved.getAppearancePalette()).isEqualTo(StoreAppearancePalette.CORAL);
        assertThat(saved.getAppearanceShape()).isEqualTo(StoreAppearanceShape.ROUNDED);

        ApiTestClient.ApiTestResponse response = api.get("/api/store/appearance", authHeaders(store, ownerEmail));

        assertThat(response.status()).isEqualTo(200);
        assertThat(response.body().get("preset")).isEqualTo("MODERN");
        assertThat(response.body().get("palette")).isEqualTo("CORAL");
        assertThat(response.body().get("shape")).isEqualTo("ROUNDED");
    }

    @Test
    void ownerAndAdminCanReadAndUpdateAppearance() throws Exception {
        ApiTestClient.ApiTestResponse ownerGet = api.get("/api/store/appearance", authHeaders(store, ownerEmail));
        assertThat(ownerGet.status()).isEqualTo(200);
        assertThat(ownerGet.body().get("preset")).isEqualTo("MODERN");

        ApiTestClient.ApiTestResponse update = api.putJson(
                "/api/store/appearance",
                Map.of("preset", "LOCAL_BUSINESS", "palette", "FOREST", "shape", "SOFT"),
                authHeaders(store, adminEmail)
        );

        assertThat(update.status()).isEqualTo(200);
        assertThat(update.body().get("preset")).isEqualTo("LOCAL_BUSINESS");
        assertThat(update.body().get("palette")).isEqualTo("FOREST");
        assertThat(update.body().get("shape")).isEqualTo("SOFT");
        Store updatedStore = storeRepository.findById(store.getId()).orElseThrow();
        assertThat(updatedStore.getAppearancePreset()).isEqualTo(StoreAppearancePreset.LOCAL_BUSINESS);
        assertThat(updatedStore.getAppearancePalette()).isEqualTo(StoreAppearancePalette.FOREST);
        assertThat(updatedStore.getAppearanceShape()).isEqualTo(StoreAppearanceShape.SOFT);
        Store untouchedStore = storeRepository.findById(otherStore.getId()).orElseThrow();
        assertThat(untouchedStore.getAppearancePreset()).isEqualTo(StoreAppearancePreset.MODERN);
        assertThat(untouchedStore.getAppearancePalette()).isEqualTo(StoreAppearancePalette.CORAL);
        assertThat(untouchedStore.getAppearanceShape()).isEqualTo(StoreAppearanceShape.ROUNDED);
    }

    @Test
    void staffAndInvalidAppearanceValuesAreRejected() throws Exception {
        ApiTestClient.ApiTestResponse staffGet = api.get("/api/store/appearance", authHeaders(store, staffEmail));
        ApiTestClient.ApiTestResponse staffPut = api.putJson(
                "/api/store/appearance",
                Map.of("preset", "CLASSIC"),
                authHeaders(store, staffEmail)
        );
        ApiTestClient.ApiTestResponse invalid = api.putJson(
                "/api/store/appearance",
                Map.of("preset", "WIX_BUILDER"),
                authHeaders(store, ownerEmail)
        );
        ApiTestClient.ApiTestResponse invalidPalette = api.putJson(
                "/api/store/appearance",
                Map.of("preset", "CLASSIC", "palette", "MAGENTA", "shape", "ROUNDED"),
                authHeaders(store, ownerEmail)
        );
        ApiTestClient.ApiTestResponse invalidShape = api.putJson(
                "/api/store/appearance",
                Map.of("preset", "CLASSIC", "palette", "CORAL", "shape", "BUBBLE"),
                authHeaders(store, ownerEmail)
        );

        assertThat(staffGet.status()).isEqualTo(403);
        assertThat(staffPut.status()).isEqualTo(403);
        assertThat(errorCode(staffGet)).isEqualTo("forbidden");
        assertThat(errorCode(staffPut)).isEqualTo("forbidden");
        assertThat(invalid.status()).isEqualTo(400);
        assertThat(errorCode(invalid)).isEqualTo("invalid_appearance_preset");
        assertThat(invalidPalette.status()).isEqualTo(400);
        assertThat(errorCode(invalidPalette)).isEqualTo("invalid_appearance_palette");
        assertThat(invalidShape.status()).isEqualTo(400);
        assertThat(errorCode(invalidShape)).isEqualTo("invalid_appearance_shape");
    }

    @Test
    void publicStorePayloadIncludesCurrentStoreAppearanceOnly() throws Exception {
        api.putJson(
                "/api/store/appearance",
                Map.of("preset", "PORTFOLIO", "palette", "OCEAN", "shape", "SQUARE"),
                authHeaders(store, ownerEmail)
        );

        ApiTestClient.ApiTestResponse publicStore = api.get("/api/public/stores/" + store.getSlug(), null);

        assertThat(publicStore.status()).isEqualTo(200);
        assertThat(publicStore.body().get("appearance")).isEqualTo("PORTFOLIO");
        assertThat(publicStore.body().get("palette")).isEqualTo("OCEAN");
        assertThat(publicStore.body().get("shape")).isEqualTo("SQUARE");
        assertThat(publicStore.rawBody()).doesNotContain(otherStore.getId().toString());
        Store untouchedStore = storeRepository.findById(otherStore.getId()).orElseThrow();
        assertThat(untouchedStore.getAppearancePreset()).isEqualTo(StoreAppearancePreset.MODERN);
        assertThat(untouchedStore.getAppearancePalette()).isEqualTo(StoreAppearancePalette.CORAL);
        assertThat(untouchedStore.getAppearanceShape()).isEqualTo(StoreAppearanceShape.ROUNDED);
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
