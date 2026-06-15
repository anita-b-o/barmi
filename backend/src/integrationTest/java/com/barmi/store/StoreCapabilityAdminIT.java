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
class StoreCapabilityAdminIT extends PostgresIntegrationTestBase {

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
    private String otherOwnerEmail;

    @Autowired
    StoreCapabilityAdminIT(
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

        store = storeRepository.save(new Store(UUID.randomUUID(), "capabilities-" + UUID.randomUUID(), "Capabilities Store"));
        otherStore = storeRepository.save(new Store(UUID.randomUUID(), "capabilities-other-" + UUID.randomUUID(), "Other Capabilities Store"));

        ownerEmail = "owner-" + UUID.randomUUID() + "@example.com";
        adminEmail = "admin-" + UUID.randomUUID() + "@example.com";
        staffEmail = "staff-" + UUID.randomUUID() + "@example.com";
        otherOwnerEmail = "other-owner-" + UUID.randomUUID() + "@example.com";

        createUserAndMembership(store, ownerEmail, StoreMemberRole.OWNER);
        createUserAndMembership(store, adminEmail, StoreMemberRole.ADMIN);
        createUserAndMembership(store, staffEmail, StoreMemberRole.STAFF);
        createUserAndMembership(otherStore, otherOwnerEmail, StoreMemberRole.OWNER);
    }

    @Test
    void newStoresReceiveEcommerceDefaults() {
        List<String> enabled = enabledCapabilitiesFor(store.getId());

        assertThat(enabled).containsExactlyInAnyOrder(
                "ABOUT",
                "PRODUCTS",
                "PROMOTIONS",
                "SHIPPING",
                "CHECKOUT",
                "CONTACT"
        );
        assertThat(countCapabilitiesFor(store.getId())).isEqualTo(9);
    }

    @Test
    void ownerAndAdminCanReadCapabilities() throws Exception {
        ApiTestClient.ApiTestResponse ownerResponse = api.get("/api/store/capabilities", authHeaders(store, ownerEmail));
        ApiTestClient.ApiTestResponse adminResponse = api.get("/api/store/capabilities", authHeaders(store, adminEmail));

        assertThat(ownerResponse.status()).isEqualTo(200);
        assertThat(adminResponse.status()).isEqualTo(200);
        assertThat((List<String>) ownerResponse.body().get("enabled")).contains("ABOUT", "PRODUCTS", "CHECKOUT");
        assertThat((List<Map<String, Object>>) ownerResponse.body().get("available")).hasSize(9);
    }

    @Test
    void publicStorePayloadIncludesOnlyEnabledCapabilities() throws Exception {
        ApiTestClient.ApiTestResponse update = api.putJson(
                "/api/store/capabilities",
                Map.of("enabled", List.of("ABOUT", "CONTACT")),
                authHeaders(store, ownerEmail)
        );
        assertThat(update.status()).isEqualTo(200);

        ApiTestClient.ApiTestResponse response = api.get("/api/public/stores/" + store.getSlug(), null);

        assertThat(response.status()).isEqualTo(200);
        assertThat((List<String>) response.body().get("capabilities")).containsExactly("ABOUT", "CONTACT");
        assertThat(response.body()).doesNotContainKeys("available");
        assertThat(response.rawBody()).doesNotContain(otherStore.getId().toString());
        assertThat(response.rawBody()).doesNotContain(otherOwnerEmail);
    }

    @Test
    void readinessIsTenantScopedAndReturnsPublicationBlockers() throws Exception {
        ApiTestClient.ApiTestResponse response = api.get("/api/store/readiness", authHeaders(store, ownerEmail));

        assertThat(response.status()).isEqualTo(200);
        assertThat(response.body().get("score")).isEqualTo(50);
        assertThat(response.body().get("publishReady")).isEqualTo(false);
        assertThat((List<String>) response.body().get("completedSteps")).contains("store_profile", "contact_info", "checkout_enabled");
        assertThat((List<String>) response.body().get("pendingSteps")).contains("first_product", "shipping_setup", "first_promotion");
        assertThat((List<String>) response.body().get("blockers")).containsExactlyInAnyOrder("first_product", "shipping_setup");
        assertThat(response.rawBody()).doesNotContain(otherStore.getId().toString());
    }

    @Test
    void putUpdatesOnlyCurrentStoreCapabilities() throws Exception {
        ApiTestClient.ApiTestResponse update = api.putJson(
                "/api/store/capabilities",
                Map.of("enabled", List.of("ABOUT", "CONTACT")),
                authHeaders(store, ownerEmail)
        );

        assertThat(update.status()).isEqualTo(200);
        assertThat((List<String>) update.body().get("enabled")).containsExactly("ABOUT", "CONTACT");
        assertThat(enabledCapabilitiesFor(store.getId())).containsExactlyInAnyOrder("ABOUT", "CONTACT");
        assertThat(enabledCapabilitiesFor(otherStore.getId())).containsExactlyInAnyOrder(
                "ABOUT",
                "PRODUCTS",
                "PROMOTIONS",
                "SHIPPING",
                "CHECKOUT",
                "CONTACT"
        );
    }

    @Test
    void invalidCapabilityFails() throws Exception {
        ApiTestClient.ApiTestResponse response = api.putJson(
                "/api/store/capabilities",
                Map.of("enabled", List.of("ABOUT", "UNKNOWN")),
                authHeaders(store, ownerEmail)
        );

        assertThat(response.status()).isEqualTo(400);
        assertThat(errorCode(response)).isEqualTo("invalid_capability");
    }

    @Test
    void staffCannotReadOrUpdateCapabilities() throws Exception {
        ApiTestClient.ApiTestResponse getResponse = api.get("/api/store/capabilities", authHeaders(store, staffEmail));
        ApiTestClient.ApiTestResponse putResponse = api.putJson(
                "/api/store/capabilities",
                Map.of("enabled", List.of("ABOUT")),
                authHeaders(store, staffEmail)
        );

        assertThat(getResponse.status()).isEqualTo(403);
        assertThat(putResponse.status()).isEqualTo(403);
        assertThat(errorCode(getResponse)).isEqualTo("forbidden");
        assertThat(errorCode(putResponse)).isEqualTo("forbidden");
    }

    private void createUserAndMembership(Store targetStore, String email, StoreMemberRole role) {
        userRepository.save(new User(
                UUID.randomUUID(),
                email,
                passwordEncoder.encode("secret"),
                UserStatus.ACTIVE
        ));
        storeMemberRepository.save(new StoreMember(
                UUID.randomUUID(),
                targetStore.getId(),
                email,
                role,
                StoreMemberStatus.ACTIVE
        ));
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

    private List<String> enabledCapabilitiesFor(UUID storeId) {
        return jdbcTemplate.queryForList(
                "select capability from store_capabilities where store_id = ? and enabled = true order by capability",
                String.class,
                storeId
        );
    }

    private int countCapabilitiesFor(UUID storeId) {
        Integer count = jdbcTemplate.queryForObject(
                "select count(*) from store_capabilities where store_id = ?",
                Integer.class,
                storeId
        );
        return count == null ? 0 : count;
    }

    private String errorCode(ApiTestClient.ApiTestResponse response) {
        return ((Map<String, Object>) response.body().get("error")).get("code").toString();
    }
}
