package com.barmi.shipping;

import com.barmi.domain.shipping.ShippingZoneType;
import com.barmi.domain.shipping.StoreShippingZone;
import com.barmi.domain.store.Store;
import com.barmi.domain.store.StoreMember;
import com.barmi.domain.store.StoreMemberRole;
import com.barmi.domain.store.StoreMemberStatus;
import com.barmi.domain.users.User;
import com.barmi.domain.users.UserStatus;
import com.barmi.infra.repo.RefreshTokenRepository;
import com.barmi.infra.repo.StoreMemberRepository;
import com.barmi.infra.repo.StoreRepository;
import com.barmi.infra.repo.StoreShippingZoneRepository;
import com.barmi.infra.repo.UserRepository;
import com.barmi.testsupport.ApiTestClient;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.TestConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;


import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase.Replace.NONE;

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
class StoreShippingZoneAdminIT {

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
    private final StoreShippingZoneRepository storeShippingZoneRepository;
    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final ApiTestClient api;

@Autowired
    StoreShippingZoneAdminIT(
            StoreRepository storeRepository,
            StoreMemberRepository storeMemberRepository,
            StoreShippingZoneRepository storeShippingZoneRepository,
            UserRepository userRepository,
            RefreshTokenRepository refreshTokenRepository,
            PasswordEncoder passwordEncoder,
            MockMvc mockMvc
    ) {
        this.storeRepository = storeRepository;
        this.storeMemberRepository = storeMemberRepository;
        this.storeShippingZoneRepository = storeShippingZoneRepository;
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.api = new ApiTestClient(mockMvc);
    }

    @Test
    void adminCrudAndConstraints() throws Exception {
        String slug1 = "shipadmin-" + UUID.randomUUID();
        String slug2 = "shipadmin2-" + UUID.randomUUID();
        Store store = storeRepository.save(new Store(UUID.randomUUID(), slug1, "Ship Admin"));
        Store store2 = storeRepository.save(new Store(UUID.randomUUID(), slug2, "Ship Admin 2"));

        refreshTokenRepository.deleteAll();
        userRepository.deleteAll();
        storeMemberRepository.deleteAll();

        String adminEmail = "admin-" + UUID.randomUUID() + "@ship.test";
        String admin2Email = "admin2-" + UUID.randomUUID() + "@ship.test";
        userRepository.save(new User(UUID.randomUUID(), adminEmail, passwordEncoder.encode("secret"), UserStatus.ACTIVE));
        userRepository.save(new User(UUID.randomUUID(), admin2Email, passwordEncoder.encode("secret"), UserStatus.ACTIVE));

        storeMemberRepository.save(new StoreMember(UUID.randomUUID(), store.getId(), adminEmail, StoreMemberRole.ADMIN, StoreMemberStatus.ACTIVE));
        storeMemberRepository.save(new StoreMember(UUID.randomUUID(), store2.getId(), admin2Email, StoreMemberRole.ADMIN, StoreMemberStatus.ACTIVE));

        String adminToken = loginAndGetAccessToken(adminEmail);
        String admin2Token = loginAndGetAccessToken(admin2Email);

        HttpHeaders adminHeaders = new HttpHeaders();
        adminHeaders.set("Host", slug1 + ".example.com");
        adminHeaders.set("X-Forwarded-Host", slug1 + ".example.com");
        adminHeaders.setBearerAuth(adminToken);

        Map<String, Object> exactBody = Map.of(
                "type", "EXACT",
                "postalCode", "1234",
                "costAmount", 5.00,
                "currency", "ARS"
        );
        ApiTestClient.ApiTestResponse exactResp = api.postJson(
                "/api/store/shipping/zones",
                exactBody,
                adminHeaders
        );
        assertThat(exactResp.status()).isEqualTo(201);

        Map<String, Object> rangeBody = Map.of(
                "type", "RANGE",
                "rangeStart", 1000,
                "rangeEnd", 1999,
                "costAmount", 10.00,
                "currency", "ARS"
        );
        ApiTestClient.ApiTestResponse rangeResp = api.postJson(
                "/api/store/shipping/zones",
                rangeBody,
                adminHeaders
        );
        assertThat(rangeResp.status()).isEqualTo(201);

        ApiTestClient.ApiTestResponse dupResp = api.postJson(
                "/api/store/shipping/zones",
                exactBody,
                adminHeaders
        );
        assertThat(dupResp.status()).isEqualTo(409);
        Map<String, Object> dupError = (Map<String, Object>) dupResp.body().get("error");
        assertThat(dupError.get("code")).isEqualTo("shipping_zone_duplicate");

        Map<String, Object> overlapBody = Map.of(
                "type", "RANGE",
                "rangeStart", 1500,
                "rangeEnd", 1600,
                "costAmount", 12.00,
                "currency", "ARS"
        );
        ApiTestClient.ApiTestResponse overlapResp = api.postJson(
                "/api/store/shipping/zones",
                overlapBody,
                adminHeaders
        );
        assertThat(overlapResp.status()).isEqualTo(409);
        Map<String, Object> overlapError = (Map<String, Object>) overlapResp.body().get("error");
        assertThat(overlapError.get("code")).isEqualTo("shipping_zone_overlap");

        HttpHeaders noAuthHeaders = new HttpHeaders();
        noAuthHeaders.set("Host", slug1 + ".example.com");
        noAuthHeaders.set("X-Forwarded-Host", slug1 + ".example.com");
        ApiTestClient.ApiTestResponse forbiddenResp = api.postJson(
                "/api/store/shipping/zones",
                exactBody,
                noAuthHeaders
        );
        assertThat(forbiddenResp.status()).isEqualTo(401);

        HttpHeaders admin2Headers = new HttpHeaders();
        admin2Headers.set("Host", slug2 + ".example.com");
        admin2Headers.set("X-Forwarded-Host", slug2 + ".example.com");
        admin2Headers.setBearerAuth(admin2Token);

        String zoneId = exactResp.body().get("zoneId").toString();
        ApiTestClient.ApiTestResponse deleteOtherStoreResp = api.delete(
                "/api/store/shipping/zones/" + zoneId,
                admin2Headers
        );
        assertThat(deleteOtherStoreResp.status()).isEqualTo(404);

        ApiTestClient.ApiTestResponse deleteOk = api.delete(
                "/api/store/shipping/zones/" + zoneId,
                adminHeaders
        );
        assertThat(deleteOk.status()).isEqualTo(204);

        List<StoreShippingZone> remaining = storeShippingZoneRepository.findByStoreIdOrderByCreatedAtAsc(store.getId());
        assertThat(remaining.stream().map(StoreShippingZone::getType)).contains(ShippingZoneType.RANGE);
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
