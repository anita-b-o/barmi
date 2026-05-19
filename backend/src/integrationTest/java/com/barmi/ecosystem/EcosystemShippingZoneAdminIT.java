package com.barmi.ecosystem;

import com.barmi.PostgresIntegrationTestBase;
import com.barmi.domain.ecosystem.Ecosystem;
import com.barmi.domain.ecosystem.EcosystemMember;
import com.barmi.domain.ecosystem.EcosystemMemberRole;
import com.barmi.domain.ecosystem.EcosystemMemberStatus;
import com.barmi.domain.shipping.EcosystemShippingZone;
import com.barmi.domain.shipping.EcosystemShippingZoneType;
import com.barmi.domain.users.User;
import com.barmi.domain.users.UserStatus;
import com.barmi.infra.repo.EcosystemMemberRepository;
import com.barmi.infra.repo.EcosystemRepository;
import com.barmi.infra.repo.EcosystemShippingZoneRepository;
import com.barmi.infra.repo.UserRepository;
import com.barmi.testsupport.ApiTestClient;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

@Testcontainers
@AutoConfigureMockMvc
class EcosystemShippingZoneAdminIT extends PostgresIntegrationTestBase {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private final MockMvc mockMvc;
    private final ApiTestClient api;
    private final EcosystemRepository ecosystemRepository;
    private final EcosystemMemberRepository ecosystemMemberRepository;
    private final EcosystemShippingZoneRepository ecosystemShippingZoneRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JdbcTemplate jdbcTemplate;

    private Ecosystem ecosystem;
    private Ecosystem otherEcosystem;
    private User adminUser;
    private User staffUser;

    @Autowired
    EcosystemShippingZoneAdminIT(
            MockMvc mockMvc,
            EcosystemRepository ecosystemRepository,
            EcosystemMemberRepository ecosystemMemberRepository,
            EcosystemShippingZoneRepository ecosystemShippingZoneRepository,
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JdbcTemplate jdbcTemplate
    ) {
        this.mockMvc = mockMvc;
        this.api = new ApiTestClient(mockMvc);
        this.ecosystemRepository = ecosystemRepository;
        this.ecosystemMemberRepository = ecosystemMemberRepository;
        this.ecosystemShippingZoneRepository = ecosystemShippingZoneRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jdbcTemplate = jdbcTemplate;
    }

    @BeforeEach
    void setup() {
        truncateAllTables(jdbcTemplate);

        ecosystem = ecosystemRepository.save(new Ecosystem(UUID.randomUUID(), "Eco Admin", "eco-admin-" + UUID.randomUUID()));
        otherEcosystem = ecosystemRepository.save(new Ecosystem(UUID.randomUUID(), "Other Eco", "other-eco-" + UUID.randomUUID()));

        adminUser = userRepository.save(new User(
                UUID.randomUUID(),
                "eco-admin-" + UUID.randomUUID() + "@example.com",
                passwordEncoder.encode("secret"),
                UserStatus.ACTIVE
        ));
        staffUser = userRepository.save(new User(
                UUID.randomUUID(),
                "eco-staff-" + UUID.randomUUID() + "@example.com",
                passwordEncoder.encode("secret"),
                UserStatus.ACTIVE
        ));

        ecosystemMemberRepository.save(new EcosystemMember(
                UUID.randomUUID(),
                adminUser.getId(),
                ecosystem.getId(),
                EcosystemMemberRole.ECOSYSTEM_ADMIN,
                EcosystemMemberStatus.ACTIVE
        ));
        ecosystemMemberRepository.save(new EcosystemMember(
                UUID.randomUUID(),
                adminUser.getId(),
                otherEcosystem.getId(),
                EcosystemMemberRole.ECOSYSTEM_ADMIN,
                EcosystemMemberStatus.ACTIVE
        ));
        ecosystemMemberRepository.save(new EcosystemMember(
                UUID.randomUUID(),
                staffUser.getId(),
                ecosystem.getId(),
                EcosystemMemberRole.ECOSYSTEM_STAFF,
                EcosystemMemberStatus.ACTIVE
        ));
    }

    @Test
    void ecosystemAdminCanListActiveZones() throws Exception {
        EcosystemShippingZone activeZone = ecosystemShippingZoneRepository.save(new EcosystemShippingZone(
                UUID.randomUUID(),
                ecosystem,
                EcosystemShippingZoneType.EXACT,
                "1234",
                null,
                null,
                new BigDecimal("150.00"),
                "ARS"
        ));
        EcosystemShippingZone inactiveZone = ecosystemShippingZoneRepository.save(new EcosystemShippingZone(
                UUID.randomUUID(),
                ecosystem,
                EcosystemShippingZoneType.EXACT,
                "5678",
                null,
                null,
                new BigDecimal("200.00"),
                "ARS"
        ));
        inactiveZone.setActive(false);
        ecosystemShippingZoneRepository.save(inactiveZone);

        List<Map<String, Object>> zones = getZones(adminHeaders(), ecosystem.getId());

        assertThat(zones).hasSize(1);
        assertThat(zones.get(0).get("zoneId")).isEqualTo(activeZone.getId().toString());
        assertThat(zones.get(0).get("isActive")).isEqualTo(true);
    }

    @Test
    void ecosystemAdminCanCreateExactZone() throws Exception {
        ApiTestClient.ApiTestResponse response = api.postJson(
                "/api/ecosystem/admin/shipping/zones",
                Map.of(
                        "ecosystemId", ecosystem.getId(),
                        "type", "EXACT",
                        "postalCode", "1234",
                        "costAmount", 150.00,
                        "currency", "ARS"
                ),
                adminHeaders()
        );

        assertThat(response.status()).isEqualTo(201);
        assertThat(response.body().get("type")).isEqualTo("EXACT");
        assertThat(response.body().get("postalCode")).isEqualTo("1234");
        assertThat(response.body().get("isActive")).isEqualTo(true);
    }

    @Test
    void ecosystemAdminCanCreateRangeZone() throws Exception {
        ApiTestClient.ApiTestResponse response = api.postJson(
                "/api/ecosystem/admin/shipping/zones",
                Map.of(
                        "ecosystemId", ecosystem.getId(),
                        "type", "RANGE",
                        "rangeStart", 1000,
                        "rangeEnd", 1999,
                        "costAmount", 200.00,
                        "currency", "ARS"
                ),
                adminHeaders()
        );

        assertThat(response.status()).isEqualTo(201);
        assertThat(response.body().get("type")).isEqualTo("RANGE");
        assertThat(response.body().get("rangeStart")).isEqualTo(1000);
        assertThat(response.body().get("rangeEnd")).isEqualTo(1999);
    }

    @Test
    void duplicateExactPostalCodeReturnsConflict() throws Exception {
        ecosystemShippingZoneRepository.save(new EcosystemShippingZone(
                UUID.randomUUID(),
                ecosystem,
                EcosystemShippingZoneType.EXACT,
                "1234",
                null,
                null,
                new BigDecimal("150.00"),
                "ARS"
        ));

        ApiTestClient.ApiTestResponse response = api.postJson(
                "/api/ecosystem/admin/shipping/zones",
                Map.of(
                        "ecosystemId", ecosystem.getId(),
                        "type", "EXACT",
                        "postalCode", "1234",
                        "costAmount", 150.00,
                        "currency", "ARS"
                ),
                adminHeaders()
        );

        assertThat(response.status()).isEqualTo(409);
        assertThat(errorCode(response)).isEqualTo("shipping_zone_duplicate");
    }

    @Test
    void overlappingRangeReturnsConflict() throws Exception {
        ecosystemShippingZoneRepository.save(new EcosystemShippingZone(
                UUID.randomUUID(),
                ecosystem,
                EcosystemShippingZoneType.RANGE,
                null,
                1000,
                1999,
                new BigDecimal("200.00"),
                "ARS"
        ));

        ApiTestClient.ApiTestResponse response = api.postJson(
                "/api/ecosystem/admin/shipping/zones",
                Map.of(
                        "ecosystemId", ecosystem.getId(),
                        "type", "RANGE",
                        "rangeStart", 1500,
                        "rangeEnd", 1600,
                        "costAmount", 210.00,
                        "currency", "ARS"
                ),
                adminHeaders()
        );

        assertThat(response.status()).isEqualTo(409);
        assertThat(errorCode(response)).isEqualTo("shipping_zone_overlap");
    }

    @Test
    void nonAdminAccessIsForbidden() throws Exception {
        ApiTestClient.ApiTestResponse response = api.postJson(
                "/api/ecosystem/admin/shipping/zones",
                Map.of(
                        "ecosystemId", ecosystem.getId(),
                        "type", "EXACT",
                        "postalCode", "1234",
                        "costAmount", 150.00,
                        "currency", "ARS"
                ),
                staffHeaders()
        );

        assertThat(response.status()).isEqualTo(403);
        assertThat(errorCode(response)).isEqualTo("forbidden");
    }

    @Test
    void deletePerformsSoftDeleteAndZoneNoLongerAppearsInList() throws Exception {
        EcosystemShippingZone zone = ecosystemShippingZoneRepository.save(new EcosystemShippingZone(
                UUID.randomUUID(),
                ecosystem,
                EcosystemShippingZoneType.EXACT,
                "1234",
                null,
                null,
                new BigDecimal("150.00"),
                "ARS"
        ));

        ApiTestClient.ApiTestResponse deleteResponse = api.delete(
                "/api/ecosystem/admin/shipping/zones/" + zone.getId() + "?ecosystemId=" + ecosystem.getId(),
                adminHeaders()
        );

        assertThat(deleteResponse.status()).isEqualTo(200);
        assertThat(deleteResponse.body().get("isActive")).isEqualTo(false);
        assertThat(ecosystemShippingZoneRepository.findById(zone.getId()).orElseThrow().isActive()).isFalse();

        List<Map<String, Object>> zones = getZones(adminHeaders(), ecosystem.getId());
        assertThat(zones).isEmpty();
    }

    @Test
    void wrongEcosystemZoneMismatchReturnsNotFound() throws Exception {
        EcosystemShippingZone zone = ecosystemShippingZoneRepository.save(new EcosystemShippingZone(
                UUID.randomUUID(),
                ecosystem,
                EcosystemShippingZoneType.EXACT,
                "1234",
                null,
                null,
                new BigDecimal("150.00"),
                "ARS"
        ));

        ApiTestClient.ApiTestResponse response = api.delete(
                "/api/ecosystem/admin/shipping/zones/" + zone.getId() + "?ecosystemId=" + otherEcosystem.getId(),
                adminHeaders()
        );

        assertThat(response.status()).isEqualTo(404);
        assertThat(errorCode(response)).isEqualTo("shipping_zone_not_found");
    }

    private HttpHeaders adminHeaders() throws Exception {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(loginAndGetAccessToken(adminUser.getEmail()));
        return headers;
    }

    private HttpHeaders staffHeaders() throws Exception {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(loginAndGetAccessToken(staffUser.getEmail()));
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

    private List<Map<String, Object>> getZones(HttpHeaders headers, UUID ecosystemId) throws Exception {
        MvcResult result = mockMvc.perform(
                get("/api/ecosystem/admin/shipping/zones")
                        .queryParam("ecosystemId", ecosystemId.toString())
                        .headers(headers)
        ).andReturn();

        assertThat(result.getResponse().getStatus()).isEqualTo(200);
        return MAPPER.readValue(
                result.getResponse().getContentAsString(StandardCharsets.UTF_8),
                new TypeReference<>() {}
        );
    }
}
