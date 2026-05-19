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
class AuthzIntegrationTest extends PostgresIntegrationTestBase {

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

    private Store store;
    private Ecosystem ecosystem;
    private User storeAdmin;
    private User storeStaff;
    private User ecoAdmin;
    private User ecoStaff;
    private String storeAdminEmail;
    private String storeStaffEmail;
    private String ecoAdminEmail;
    private String ecoStaffEmail;

    @Autowired
    AuthzIntegrationTest(
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

        String storeSlug = "authz-store-" + UUID.randomUUID();
        String ecoSlug = "authz-eco-" + UUID.randomUUID();
        store = storeRepository.save(new Store(UUID.randomUUID(), storeSlug, "Authz Store"));
        ecosystem = ecosystemRepository.save(new Ecosystem(UUID.randomUUID(), "Authz Eco", ecoSlug));

        storeAdminEmail = "store-admin-" + UUID.randomUUID() + "@example.com";
        storeStaffEmail = "store-staff-" + UUID.randomUUID() + "@example.com";
        ecoAdminEmail = "eco-admin-" + UUID.randomUUID() + "@example.com";
        ecoStaffEmail = "eco-staff-" + UUID.randomUUID() + "@example.com";

        storeAdmin = userRepository.save(new User(
                UUID.randomUUID(),
                storeAdminEmail,
                passwordEncoder.encode("secret"),
                UserStatus.ACTIVE
        ));
        storeStaff = userRepository.save(new User(
                UUID.randomUUID(),
                storeStaffEmail,
                passwordEncoder.encode("secret"),
                UserStatus.ACTIVE
        ));
        ecoAdmin = userRepository.save(new User(
                UUID.randomUUID(),
                ecoAdminEmail,
                passwordEncoder.encode("secret"),
                UserStatus.ACTIVE
        ));
        ecoStaff = userRepository.save(new User(
                UUID.randomUUID(),
                ecoStaffEmail,
                passwordEncoder.encode("secret"),
                UserStatus.ACTIVE
        ));

        storeMemberRepository.save(new StoreMember(
                UUID.randomUUID(),
                store.getId(),
                storeAdminEmail,
                StoreMemberRole.ADMIN,
                StoreMemberStatus.ACTIVE
        ));
        storeMemberRepository.save(new StoreMember(
                UUID.randomUUID(),
                store.getId(),
                storeStaffEmail,
                StoreMemberRole.STAFF,
                StoreMemberStatus.ACTIVE
        ));

        ecosystemMemberRepository.save(new EcosystemMember(
                UUID.randomUUID(),
                ecoAdmin.getId(),
                ecosystem.getId(),
                EcosystemMemberRole.ECOSYSTEM_ADMIN,
                EcosystemMemberStatus.ACTIVE
        ));
        ecosystemMemberRepository.save(new EcosystemMember(
                UUID.randomUUID(),
                ecoStaff.getId(),
                ecosystem.getId(),
                EcosystemMemberRole.ECOSYSTEM_STAFF,
                EcosystemMemberStatus.ACTIVE
        ));
    }

    @Test
    void storeAdminEndpointAllowedForAdmin() throws Exception {
        String token = loginAndGetAccessToken(storeAdminEmail);

        HttpHeaders headers = api.storeHostHeaders(store.getSlug());
        headers.setBearerAuth(token);

        Map<String, Object> payload = Map.of(
                "type", "EXACT",
                "postalCode", "1234",
                "costAmount", 5.00,
                "currency", "ARS"
        );

        ApiTestClient.ApiTestResponse response = api.postJson("/api/store/shipping/zones", payload, headers);
        assertThat(response.status()).isEqualTo(201);
    }

    @Test
    void storeAdminEndpointForbiddenForStaff() throws Exception {
        String token = loginAndGetAccessToken(storeStaffEmail);

        HttpHeaders headers = api.storeHostHeaders(store.getSlug());
        headers.setBearerAuth(token);

        Map<String, Object> payload = Map.of(
                "type", "EXACT",
                "postalCode", "1234",
                "costAmount", 5.00,
                "currency", "ARS"
        );

        ApiTestClient.ApiTestResponse response = api.postJson("/api/store/shipping/zones", payload, headers);
        assertThat(response.status()).isEqualTo(403);
        assertThat(((Map<String, Object>) response.body().get("error")).get("code")).isEqualTo("forbidden");
    }

    @Test
    void ecosystemAdminEndpointAllowedForAdmin() throws Exception {
        String token = loginAndGetAccessToken(ecoAdminEmail);

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);

        Map<String, Object> payload = Map.of(
                "ecosystemId", ecosystem.getId(),
                "name", "Coffee",
                "priceAmount", 10.00,
                "currency", "ARS",
                "deliverySupported", true,
                "isActive", true
        );

        ApiTestClient.ApiTestResponse response = api.postJson("/api/ecosystem/admin/products", payload, headers);
        assertThat(response.status()).isEqualTo(201);
    }

    @Test
    void ecosystemAdminEndpointForbiddenForStaff() throws Exception {
        String token = loginAndGetAccessToken(ecoStaffEmail);

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);

        Map<String, Object> payload = Map.of(
                "ecosystemId", ecosystem.getId(),
                "name", "Tea",
                "priceAmount", 8.00,
                "currency", "ARS",
                "deliverySupported", true,
                "isActive", true
        );

        ApiTestClient.ApiTestResponse response = api.postJson("/api/ecosystem/admin/products", payload, headers);
        assertThat(response.status()).isEqualTo(403);
        assertThat(((Map<String, Object>) response.body().get("error")).get("code")).isEqualTo("forbidden");
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
}
