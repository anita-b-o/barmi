package com.barmi.auth;

import com.barmi.PostgresIntegrationTestBase;
import com.barmi.domain.ecosystem.Ecosystem;
import com.barmi.domain.ecosystem.EcosystemMember;
import com.barmi.domain.ecosystem.EcosystemMemberRole;
import com.barmi.domain.ecosystem.EcosystemMemberStatus;
import com.barmi.domain.store.Store;
import com.barmi.domain.store.StoreMember;
import com.barmi.domain.store.StoreMemberRole;
import com.barmi.domain.store.StoreMemberStatus;
import com.barmi.domain.users.User;
import com.barmi.domain.users.UserStatus;
import com.barmi.infra.repo.EcosystemMemberRepository;
import com.barmi.infra.repo.EcosystemExternalProductRepository;
import com.barmi.infra.repo.EcosystemFulfillmentRepository;
import com.barmi.infra.repo.EcosystemOrderRepository;
import com.barmi.infra.repo.EcosystemRepository;
import com.barmi.infra.repo.EcosystemShippingZoneRepository;
import com.barmi.infra.repo.PaymentIntentRepository;
import com.barmi.infra.repo.PaymentRepository;
import com.barmi.infra.repo.RefreshTokenRepository;
import com.barmi.infra.repo.StoreFulfillmentRepository;
import com.barmi.infra.repo.StoreMemberRepository;
import com.barmi.infra.repo.StoreOrderItemRepository;
import com.barmi.infra.repo.StoreOrderRepository;
import com.barmi.infra.repo.StoreRepository;
import com.barmi.infra.repo.StoreShippingZoneRepository;
import com.barmi.infra.repo.UserRepository;
import com.barmi.testsupport.ApiTestClient;
import jakarta.servlet.http.Cookie;
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
class AuthIntegrationTest extends PostgresIntegrationTestBase {

    private final ApiTestClient api;
    private final UserRepository userRepository;
    private final StoreRepository storeRepository;
    private final StoreMemberRepository storeMemberRepository;
    private final EcosystemRepository ecosystemRepository;
    private final EcosystemOrderRepository ecosystemOrderRepository;
    private final EcosystemFulfillmentRepository ecosystemFulfillmentRepository;
    private final EcosystemShippingZoneRepository ecosystemShippingZoneRepository;
    private final EcosystemExternalProductRepository ecosystemExternalProductRepository;
    private final EcosystemMemberRepository ecosystemMemberRepository;
    private final StoreOrderRepository storeOrderRepository;
    private final StoreOrderItemRepository storeOrderItemRepository;
    private final StoreFulfillmentRepository storeFulfillmentRepository;
    private final StoreShippingZoneRepository storeShippingZoneRepository;
    private final PaymentIntentRepository paymentIntentRepository;
    private final PaymentRepository paymentRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JdbcTemplate jdbcTemplate;

    private User activeUser;
    private User inactiveUser;
    private Store store;
    private Ecosystem ecosystem;
    private String activeEmail;
    private String inactiveEmail;
    private String storeSlug;
    private String ecosystemSlug;

    @Autowired
    AuthIntegrationTest(
            MockMvc mockMvc,
            UserRepository userRepository,
            StoreRepository storeRepository,
            StoreMemberRepository storeMemberRepository,
            EcosystemRepository ecosystemRepository,
            EcosystemOrderRepository ecosystemOrderRepository,
            EcosystemFulfillmentRepository ecosystemFulfillmentRepository,
            EcosystemShippingZoneRepository ecosystemShippingZoneRepository,
            EcosystemExternalProductRepository ecosystemExternalProductRepository,
            EcosystemMemberRepository ecosystemMemberRepository,
            StoreOrderRepository storeOrderRepository,
            StoreOrderItemRepository storeOrderItemRepository,
            StoreFulfillmentRepository storeFulfillmentRepository,
            StoreShippingZoneRepository storeShippingZoneRepository,
            PaymentIntentRepository paymentIntentRepository,
            PaymentRepository paymentRepository,
            RefreshTokenRepository refreshTokenRepository,
            PasswordEncoder passwordEncoder,
            JdbcTemplate jdbcTemplate
    ) {
        this.api = new ApiTestClient(mockMvc);
        this.userRepository = userRepository;
        this.storeRepository = storeRepository;
        this.storeMemberRepository = storeMemberRepository;
        this.ecosystemRepository = ecosystemRepository;
        this.ecosystemOrderRepository = ecosystemOrderRepository;
        this.ecosystemFulfillmentRepository = ecosystemFulfillmentRepository;
        this.ecosystemShippingZoneRepository = ecosystemShippingZoneRepository;
        this.ecosystemExternalProductRepository = ecosystemExternalProductRepository;
        this.ecosystemMemberRepository = ecosystemMemberRepository;
        this.storeOrderRepository = storeOrderRepository;
        this.storeOrderItemRepository = storeOrderItemRepository;
        this.storeFulfillmentRepository = storeFulfillmentRepository;
        this.storeShippingZoneRepository = storeShippingZoneRepository;
        this.paymentIntentRepository = paymentIntentRepository;
        this.paymentRepository = paymentRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.jdbcTemplate = jdbcTemplate;
    }

    @BeforeEach
    void setup() {
        truncateAllTables(jdbcTemplate);

        activeEmail = "admin-" + UUID.randomUUID() + "@example.com";
        inactiveEmail = "inactive-" + UUID.randomUUID() + "@example.com";
        storeSlug = "demo-store-" + UUID.randomUUID();
        ecosystemSlug = "demo-ecosystem-" + UUID.randomUUID();

        activeUser = new User(
                UUID.randomUUID(),
                activeEmail,
                passwordEncoder.encode("secret"),
                UserStatus.ACTIVE
        );
        userRepository.save(activeUser);

        inactiveUser = new User(
                UUID.randomUUID(),
                inactiveEmail,
                passwordEncoder.encode("secret"),
                UserStatus.INACTIVE
        );
        userRepository.save(inactiveUser);

        store = new Store(UUID.randomUUID(), storeSlug, "Demo Store");
        storeRepository.save(store);

        ecosystem = new Ecosystem(UUID.randomUUID(), "Demo Eco", ecosystemSlug);
        ecosystemRepository.save(ecosystem);

        storeMemberRepository.save(new StoreMember(
                UUID.randomUUID(),
                store.getId(),
                activeUser.getEmail(),
                StoreMemberRole.ADMIN,
                StoreMemberStatus.ACTIVE
        ));

        ecosystemMemberRepository.save(new EcosystemMember(
                UUID.randomUUID(),
                activeUser.getId(),
                ecosystem.getId(),
                EcosystemMemberRole.ECOSYSTEM_ADMIN,
                EcosystemMemberStatus.ACTIVE
        ));
    }

    @Test
    void loginSuccess() throws Exception {
        Map<String, Object> payload = Map.of(
                "email", activeUser.getEmail(),
                "password", "secret"
        );

        ApiTestClient.ApiTestResponse response = api.postJson("/api/auth/login", payload, null);
        assertThat(response.status()).isEqualTo(200);
        assertThat(response.body()).containsKeys("accessToken", "tokenType", "expiresAt");
        assertThat(response.body()).doesNotContainKey("refreshToken");
        assertThat(response.body().get("tokenType")).isEqualTo("Bearer");
        assertThat(refreshTokenRepository.findAll()).hasSize(1);
        String refreshCookieHeader = requireRefreshCookieHeader(response);
        assertThat(refreshCookieHeader).contains("HttpOnly");
        assertThat(refreshCookieHeader).contains("Path=/api/auth");
        assertThat(refreshCookieHeader).contains("SameSite=Lax");
        assertThat(refreshCookieHeader).contains("Max-Age=");
        assertThat(refreshCookieHeader).doesNotContain("Secure");
        Cookie refreshCookie = requireRefreshCookie(response);
        assertThat(refreshTokenRepository.findAll().get(0).getTokenDigest()).isNotEqualTo(refreshCookie.getValue());
        assertThat(refreshTokenRepository.findAll().get(0).getTokenHash()).isNotBlank();
    }

    @Test
    void loginInvalidCredentials() throws Exception {
        Map<String, Object> payload = Map.of(
                "email", activeUser.getEmail(),
                "password", "wrong"
        );

        ApiTestClient.ApiTestResponse response = api.postJson("/api/auth/login", payload, null);
        assertThat(response.status()).isEqualTo(401);
        assertThat(((Map<String, Object>) response.body().get("error")).get("code")).isEqualTo("invalid_credentials");
    }

    @Test
    void loginInactiveUser() throws Exception {
        Map<String, Object> payload = Map.of(
                "email", inactiveUser.getEmail(),
                "password", "secret"
        );

        ApiTestClient.ApiTestResponse response = api.postJson("/api/auth/login", payload, null);
        assertThat(response.status()).isEqualTo(403);
        assertThat(((Map<String, Object>) response.body().get("error")).get("code")).isEqualTo("user_inactive");
    }

    @Test
    void refreshSuccess() throws Exception {
        Map<String, Object> payload = Map.of(
                "email", activeUser.getEmail(),
                "password", "secret"
        );

        ApiTestClient.ApiTestResponse login = api.postJson("/api/auth/login", payload, null);
        Cookie refreshCookie = requireRefreshCookie(login);

        ApiTestClient.ApiTestResponse refreshed = api.postJson(
                "/api/auth/refresh",
                Map.of(),
                null,
                refreshCookie
        );

        assertThat(refreshed.status()).isEqualTo(200);
        assertThat(refreshed.body()).containsKeys("accessToken", "tokenType", "expiresAt");
        Cookie rotatedCookie = requireRefreshCookie(refreshed);
        assertThat(rotatedCookie.getValue()).isNotEqualTo(refreshCookie.getValue());
        ApiTestClient.ApiTestResponse reused = api.postJson(
                "/api/auth/refresh",
                Map.of(),
                null,
                refreshCookie
        );
        assertThat(reused.status()).isEqualTo(401);
    }

    @Test
    void refreshInvalidToken() throws Exception {
        ApiTestClient.ApiTestResponse refreshed = api.postJson(
                "/api/auth/refresh",
                null,
                null,
                new Cookie("barmi_refresh_token", "invalid")
        );

        assertThat(refreshed.status()).isEqualTo(401);
        assertThat(((Map<String, Object>) refreshed.body().get("error")).get("code")).isEqualTo("invalid_refresh_token");
        String clearedCookieHeader = requireRefreshCookieHeader(refreshed);
        assertThat(clearedCookieHeader).contains("Max-Age=0");
        assertThat(clearedCookieHeader).contains("Path=/api/auth");
        assertThat(clearedCookieHeader).contains("SameSite=Lax");
    }

    @Test
    void refreshExpiredTokenReturnsRefreshTokenExpired() throws Exception {
        ApiTestClient.ApiTestResponse login = api.postJson(
                "/api/auth/login",
                Map.of("email", activeUser.getEmail(), "password", "secret"),
                null
        );
        Cookie refreshCookie = requireRefreshCookie(login);
        UUID tokenId = refreshTokenRepository.findAll().get(0).getId();
        jdbcTemplate.update("update refresh_tokens set expires_at = now() - interval '1 second' where id = ?", tokenId);

        ApiTestClient.ApiTestResponse refreshed = api.postJson(
                "/api/auth/refresh",
                Map.of(),
                null,
                refreshCookie
        );

        assertThat(refreshed.status()).isEqualTo(401);
        assertThat(((Map<String, Object>) refreshed.body().get("error")).get("code")).isEqualTo("refresh_token_expired");
        String clearedCookieHeader = requireRefreshCookieHeader(refreshed);
        assertThat(clearedCookieHeader).contains("Max-Age=0");
    }

    @Test
    void logoutRevokesRefreshCookieAndReturnsOkEvenWithoutCookie() throws Exception {
        ApiTestClient.ApiTestResponse login = api.postJson(
                "/api/auth/login",
                Map.of("email", activeUser.getEmail(), "password", "secret"),
                null
        );
        Cookie refreshCookie = requireRefreshCookie(login);

        ApiTestClient.ApiTestResponse logout = api.postJson("/api/auth/logout", Map.of(), null, refreshCookie);
        assertThat(logout.status()).isEqualTo(200);
        String clearedCookieHeader = requireRefreshCookieHeader(logout);
        assertThat(clearedCookieHeader).contains("Max-Age=0");
        assertThat(clearedCookieHeader).contains("Path=/api/auth");
        assertThat(clearedCookieHeader).contains("SameSite=Lax");

        ApiTestClient.ApiTestResponse refreshed = api.postJson("/api/auth/refresh", Map.of(), null, refreshCookie);
        assertThat(refreshed.status()).isEqualTo(401);

        ApiTestClient.ApiTestResponse logoutWithoutCookie = api.postJson("/api/auth/logout", Map.of(), null);
        assertThat(logoutWithoutCookie.status()).isEqualTo(200);
    }

    @Test
    void refreshRejectsLegacyRequestBodyWithoutCookie() throws Exception {
        ApiTestClient.ApiTestResponse refreshed = api.postJson(
                "/api/auth/refresh",
                Map.of("refreshToken", "legacy-body-token"),
                null
        );

        assertThat(refreshed.status()).isEqualTo(401);
        assertThat(((Map<String, Object>) refreshed.body().get("error")).get("code")).isEqualTo("invalid_refresh_token");
        String clearedCookieHeader = requireRefreshCookieHeader(refreshed);
        assertThat(clearedCookieHeader).contains("Max-Age=0");
        assertThat(clearedCookieHeader).contains("Path=/api/auth");
        assertThat(clearedCookieHeader).contains("SameSite=Lax");
    }

    @Test
    void meSuccess() throws Exception {
        String accessToken = loginAndGetAccessToken(activeUser.getEmail(), "secret");

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);

        ApiTestClient.ApiTestResponse response = api.get("/api/auth/me", headers);
        assertThat(response.status()).isEqualTo(200);
        assertThat(response.body().get("userId").toString()).isEqualTo(activeUser.getId().toString());
        Map<String, Object> memberships = (Map<String, Object>) response.body().get("memberships");
        List<Map<String, Object>> stores = (List<Map<String, Object>>) memberships.get("stores");
        assertThat(stores).hasSize(1);
        assertThat(stores.get(0).get("storeId").toString()).isEqualTo(store.getId().toString());
        List<Map<String, Object>> ecosystems = (List<Map<String, Object>>) memberships.get("ecosystems");
        assertThat(ecosystems).hasSize(1);
        assertThat(ecosystems.get(0).get("ecosystemId").toString()).isEqualTo(ecosystem.getId().toString());
    }

    @Test
    void meUnauthorized() throws Exception {
        ApiTestClient.ApiTestResponse response = api.get("/api/auth/me", null);
        assertThat(response.status()).isEqualTo(401);
        assertThat(((Map<String, Object>) response.body().get("error")).get("code")).isEqualTo("unauthorized");
    }

    private String loginAndGetAccessToken(String email, String password) throws Exception {
        ApiTestClient.ApiTestResponse login = api.postJson(
                "/api/auth/login",
                Map.of("email", email, "password", password),
                null
        );
        return login.body().get("accessToken").toString();
    }

    private Cookie requireRefreshCookie(ApiTestClient.ApiTestResponse response) {
        String header = requireRefreshCookieHeader(response);
        String[] parts = header.split(";", 2);
        String[] nameValue = parts[0].split("=", 2);
        return new Cookie(nameValue[0], nameValue.length > 1 ? nameValue[1] : "");
    }

    private String requireRefreshCookieHeader(ApiTestClient.ApiTestResponse response) {
        return response.headers().getOrEmpty(HttpHeaders.SET_COOKIE).stream()
                .filter(value -> value.startsWith("barmi_refresh_token="))
                .findFirst()
                .orElseThrow(() -> new AssertionError("refresh cookie header missing"));
    }
}
