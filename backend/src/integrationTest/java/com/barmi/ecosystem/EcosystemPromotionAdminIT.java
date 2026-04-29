package com.barmi.ecosystem;

import com.barmi.domain.ecosystem.Ecosystem;
import com.barmi.domain.ecosystem.EcosystemMember;
import com.barmi.domain.ecosystem.EcosystemMemberRole;
import com.barmi.domain.ecosystem.EcosystemMemberStatus;
import com.barmi.domain.users.User;
import com.barmi.domain.users.UserStatus;
import com.barmi.infra.repo.EcosystemMemberRepository;
import com.barmi.infra.repo.EcosystemRepository;
import com.barmi.infra.repo.RefreshTokenRepository;
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
class EcosystemPromotionAdminIT {

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

    private final EcosystemRepository ecosystemRepository;
    private final EcosystemMemberRepository ecosystemMemberRepository;
    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final MockMvc mockMvc;
    private final ApiTestClient api;

    @Autowired
    EcosystemPromotionAdminIT(
            EcosystemRepository ecosystemRepository,
            EcosystemMemberRepository ecosystemMemberRepository,
            UserRepository userRepository,
            RefreshTokenRepository refreshTokenRepository,
            PasswordEncoder passwordEncoder,
            MockMvc mockMvc
    ) {
        this.ecosystemRepository = ecosystemRepository;
        this.ecosystemMemberRepository = ecosystemMemberRepository;
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.mockMvc = mockMvc;
        this.api = new ApiTestClient(mockMvc);
    }

    @Test
    void adminCanCreateListAndTogglePromotionsWithinEcosystemScope() throws Exception {
        Ecosystem ecosystem = ecosystemRepository.save(new Ecosystem(UUID.randomUUID(), "Eco Promotions", "eco-promotions-" + UUID.randomUUID()));
        Ecosystem otherEcosystem = ecosystemRepository.save(new Ecosystem(UUID.randomUUID(), "Eco Other", "eco-other-" + UUID.randomUUID()));

        refreshTokenRepository.deleteAll();
        userRepository.deleteAll();
        ecosystemMemberRepository.deleteAll();

        String adminEmail = "admin-" + UUID.randomUUID() + "@ecosystem.test";
        String otherAdminEmail = "admin-" + UUID.randomUUID() + "@other.test";
        User admin = userRepository.save(new User(UUID.randomUUID(), adminEmail, passwordEncoder.encode("secret"), UserStatus.ACTIVE));
        User otherAdmin = userRepository.save(new User(UUID.randomUUID(), otherAdminEmail, passwordEncoder.encode("secret"), UserStatus.ACTIVE));
        ecosystemMemberRepository.save(new EcosystemMember(UUID.randomUUID(), admin.getId(), ecosystem.getId(), EcosystemMemberRole.ECOSYSTEM_ADMIN, EcosystemMemberStatus.ACTIVE));
        ecosystemMemberRepository.save(new EcosystemMember(UUID.randomUUID(), otherAdmin.getId(), otherEcosystem.getId(), EcosystemMemberRole.ECOSYSTEM_ADMIN, EcosystemMemberStatus.ACTIVE));

        HttpHeaders adminHeaders = new HttpHeaders();
        adminHeaders.setBearerAuth(loginAndGetAccessToken(adminEmail));
        HttpHeaders otherAdminHeaders = new HttpHeaders();
        otherAdminHeaders.setBearerAuth(loginAndGetAccessToken(otherAdminEmail));

        ApiTestClient.ApiTestResponse createResponse = api.postJson(
                "/api/ecosystem/admin/promotions",
                Map.of(
                        "ecosystemId", ecosystem.getId().toString(),
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

        String promotionId = createResponse.body().get("id").toString();

        List<Map<String, Object>> promotions = getList(
                "/api/ecosystem/admin/promotions?ecosystemId=" + ecosystem.getId(),
                adminHeaders
        );
        assertThat(promotions).hasSize(1);
        assertThat(promotions.get(0).get("code")).isEqualTo("BIENVENIDA10");

        ApiTestClient.ApiTestResponse toggleResponse = api.patchJson(
                "/api/ecosystem/admin/promotions/" + promotionId + "/active",
                Map.of("ecosystemId", ecosystem.getId().toString(), "active", false),
                adminHeaders
        );
        assertThat(toggleResponse.status()).isEqualTo(200);
        assertThat(toggleResponse.body().get("active")).isEqualTo(false);

        ApiTestClient.ApiTestResponse foreignToggleResponse = api.patchJson(
                "/api/ecosystem/admin/promotions/" + promotionId + "/active",
                Map.of("ecosystemId", otherEcosystem.getId().toString(), "active", true),
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
