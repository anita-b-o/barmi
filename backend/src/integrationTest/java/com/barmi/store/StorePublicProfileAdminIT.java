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

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@Testcontainers
@AutoConfigureMockMvc
class StorePublicProfileAdminIT extends PostgresIntegrationTestBase {
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
    StorePublicProfileAdminIT(
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
        store = storeRepository.save(new Store(UUID.randomUUID(), "profile-" + UUID.randomUUID(), "Profile Store"));
        otherStore = storeRepository.save(new Store(UUID.randomUUID(), "profile-other-" + UUID.randomUUID(), "Other Profile Store"));
        ownerEmail = "owner-" + UUID.randomUUID() + "@example.com";
        adminEmail = "admin-" + UUID.randomUUID() + "@example.com";
        staffEmail = "staff-" + UUID.randomUUID() + "@example.com";
        createUserAndMembership(store, ownerEmail, StoreMemberRole.OWNER);
        createUserAndMembership(store, adminEmail, StoreMemberRole.ADMIN);
        createUserAndMembership(store, staffEmail, StoreMemberRole.STAFF);
    }

    @Test
    void ownerAndAdminCanGetAndPutPublicProfile() throws Exception {
        ApiTestClient.ApiTestResponse empty = api.get("/api/store/profile", authHeaders(store, ownerEmail));
        assertThat(empty.status()).isEqualTo(200);
        assertThat(empty.body().get("publicDescription")).isNull();

        ApiTestClient.ApiTestResponse update = api.putJson(
                "/api/store/profile",
                Map.of(
                        "publicDescription", "  Peluquería de barrio con atención simple.  ",
                        "publicEmail", " contacto@demo.test ",
                        "publicPhone", " 221 555 0101 ",
                        "publicWhatsapp", " +54 9 221 555 0101 "
                ),
                authHeaders(store, adminEmail)
        );

        assertThat(update.status()).isEqualTo(200);
        assertThat(update.body().get("publicDescription")).isEqualTo("Peluquería de barrio con atención simple.");
        assertThat(update.body().get("publicEmail")).isEqualTo("contacto@demo.test");
        assertThat(update.body().get("publicPhone")).isEqualTo("221 555 0101");
        assertThat(update.body().get("publicWhatsapp")).isEqualTo("+54 9 221 555 0101");

        Store saved = storeRepository.findById(store.getId()).orElseThrow();
        assertThat(saved.getPublicDescription()).isEqualTo("Peluquería de barrio con atención simple.");
        assertThat(storeRepository.findById(otherStore.getId()).orElseThrow().getPublicDescription()).isNull();
    }

    @Test
    void rejectsTooLongProfileFieldsAndStaff() throws Exception {
        ApiTestClient.ApiTestResponse tooLongDescription = api.putJson(
                "/api/store/profile",
                Map.of("publicDescription", "a".repeat(1001)),
                authHeaders(store, ownerEmail)
        );
        assertThat(tooLongDescription.status()).isEqualTo(400);
        assertThat(errorCode(tooLongDescription)).isEqualTo("public_description_too_long");

        ApiTestClient.ApiTestResponse tooLongEmail = api.putJson(
                "/api/store/profile",
                Map.of("publicEmail", "a".repeat(161)),
                authHeaders(store, ownerEmail)
        );
        assertThat(tooLongEmail.status()).isEqualTo(400);
        assertThat(errorCode(tooLongEmail)).isEqualTo("public_email_too_long");

        ApiTestClient.ApiTestResponse staffGet = api.get("/api/store/profile", authHeaders(store, staffEmail));
        ApiTestClient.ApiTestResponse staffPut = api.putJson(
                "/api/store/profile",
                Map.of("publicDescription", "No autorizado"),
                authHeaders(store, staffEmail)
        );
        assertThat(staffGet.status()).isEqualTo(403);
        assertThat(staffPut.status()).isEqualTo(403);
    }

    @Test
    void publicStorePayloadIncludesProfileAndReadinessUsesIt() throws Exception {
        api.putJson(
                "/api/store/capabilities",
                Map.of("enabled", List.of("ABOUT", "CONTACT")),
                authHeaders(store, ownerEmail)
        );
        api.putJson(
                "/api/store/profile",
                Map.of(
                        "publicDescription", "Taller de arreglos rápidos.",
                        "publicWhatsapp", "221 555 0101"
                ),
                authHeaders(store, ownerEmail)
        );

        ApiTestClient.ApiTestResponse publicStore = api.get("/api/public/stores/" + store.getSlug(), null);
        assertThat(publicStore.status()).isEqualTo(200);
        Map<String, Object> profile = (Map<String, Object>) publicStore.body().get("profile");
        assertThat(profile.get("description")).isEqualTo("Taller de arreglos rápidos.");
        assertThat(profile.get("whatsapp")).isEqualTo("221 555 0101");
        assertThat(publicStore.rawBody()).doesNotContain(otherStore.getId().toString());

        ApiTestClient.ApiTestResponse readiness = api.get("/api/store/readiness", authHeaders(store, ownerEmail));
        assertThat(readiness.status()).isEqualTo(200);
        assertThat((List<String>) readiness.body().get("completedSteps")).contains("store_profile", "contact_info");
        assertThat((List<String>) readiness.body().get("blockers")).isEmpty();
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
