package com.barmi.ecosystem;

import com.barmi.PostgresIntegrationTestBase;
import com.barmi.domain.ecosystem.Ecosystem;
import com.barmi.domain.ecosystem.EcosystemMember;
import com.barmi.domain.ecosystem.EcosystemMemberRole;
import com.barmi.domain.ecosystem.EcosystemMemberStatus;
import com.barmi.domain.fulfillment.EcosystemFulfillment;
import com.barmi.domain.fulfillment.FulfillmentStatus;
import com.barmi.domain.orders.EcosystemOrder;
import com.barmi.domain.orders.EcosystemOrderItem;
import com.barmi.domain.users.User;
import com.barmi.domain.users.UserStatus;
import com.barmi.infra.repo.EcosystemFulfillmentRepository;
import com.barmi.infra.repo.EcosystemMemberRepository;
import com.barmi.infra.repo.EcosystemOrderRepository;
import com.barmi.infra.repo.EcosystemRepository;
import com.barmi.infra.repo.RefreshTokenRepository;
import com.barmi.infra.repo.UserRepository;
import com.barmi.testsupport.ApiTestClient;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

@Testcontainers
@AutoConfigureMockMvc
class EcosystemFulfillmentAdminIT extends PostgresIntegrationTestBase {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private final MockMvc mockMvc;
    private final ApiTestClient api;
    private final EcosystemRepository ecosystemRepository;
    private final EcosystemOrderRepository ecosystemOrderRepository;
    private final EcosystemFulfillmentRepository ecosystemFulfillmentRepository;
    private final EcosystemMemberRepository ecosystemMemberRepository;
    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JdbcTemplate jdbcTemplate;
    private final EntityManager entityManager;

    private Ecosystem ecosystem;
    private Ecosystem otherEcosystem;
    private User adminUser;
    private User staffUser;
    private User otherAdminUser;
    private EcosystemOrder paidOrder;
    private EcosystemOrder pendingOrder;
    private EcosystemFulfillment existingFulfillment;
    private EcosystemFulfillment otherFulfillment;

    @Autowired
    EcosystemFulfillmentAdminIT(
            MockMvc mockMvc,
            EcosystemRepository ecosystemRepository,
            EcosystemOrderRepository ecosystemOrderRepository,
            EcosystemFulfillmentRepository ecosystemFulfillmentRepository,
            EcosystemMemberRepository ecosystemMemberRepository,
            UserRepository userRepository,
            RefreshTokenRepository refreshTokenRepository,
            PasswordEncoder passwordEncoder,
            JdbcTemplate jdbcTemplate,
            EntityManager entityManager
    ) {
        this.mockMvc = mockMvc;
        this.api = new ApiTestClient(mockMvc);
        this.ecosystemRepository = ecosystemRepository;
        this.ecosystemOrderRepository = ecosystemOrderRepository;
        this.ecosystemFulfillmentRepository = ecosystemFulfillmentRepository;
        this.ecosystemMemberRepository = ecosystemMemberRepository;
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.jdbcTemplate = jdbcTemplate;
        this.entityManager = entityManager;
    }

    @BeforeEach
    void setup() {
        refreshTokenRepository.deleteAll();
        ecosystemMemberRepository.deleteAll();
        ecosystemFulfillmentRepository.deleteAll();
        ecosystemOrderRepository.deleteAll();
        userRepository.deleteAll();
        ecosystemRepository.deleteAll();

        ecosystem = ecosystemRepository.save(new Ecosystem(UUID.randomUUID(), "Ecosystem A", "eco-a-" + UUID.randomUUID()));
        otherEcosystem = ecosystemRepository.save(new Ecosystem(UUID.randomUUID(), "Ecosystem B", "eco-b-" + UUID.randomUUID()));

        adminUser = createUser("eco-admin");
        staffUser = createUser("eco-staff");
        otherAdminUser = createUser("eco-other-admin");

        ecosystemMemberRepository.save(new EcosystemMember(
                UUID.randomUUID(), adminUser.getId(), ecosystem.getId(),
                EcosystemMemberRole.ECOSYSTEM_ADMIN, EcosystemMemberStatus.ACTIVE
        ));
        ecosystemMemberRepository.save(new EcosystemMember(
                UUID.randomUUID(), staffUser.getId(), ecosystem.getId(),
                EcosystemMemberRole.ECOSYSTEM_STAFF, EcosystemMemberStatus.ACTIVE
        ));
        ecosystemMemberRepository.save(new EcosystemMember(
                UUID.randomUUID(), otherAdminUser.getId(), otherEcosystem.getId(),
                EcosystemMemberRole.ECOSYSTEM_ADMIN, EcosystemMemberStatus.ACTIVE
        ));

        paidOrder = createOrder(ecosystem, true);
        pendingOrder = createOrder(ecosystem, false);
        EcosystemOrder olderPaidOrder = createOrder(ecosystem, true);
        EcosystemOrder otherPaidOrder = createOrder(otherEcosystem, true);

        existingFulfillment = ecosystemFulfillmentRepository.save(new EcosystemFulfillment(
                UUID.randomUUID(), paidOrder.getId(), ecosystem.getId(), "DELIVERY", FulfillmentStatus.DISPATCHED
        ));
        otherFulfillment = ecosystemFulfillmentRepository.save(new EcosystemFulfillment(
                UUID.randomUUID(), otherPaidOrder.getId(), otherEcosystem.getId(), "DELIVERY", FulfillmentStatus.PENDING
        ));
        ecosystemFulfillmentRepository.save(new EcosystemFulfillment(
                UUID.randomUUID(), olderPaidOrder.getId(), ecosystem.getId(), "DELIVERY", FulfillmentStatus.PENDING
        ));
    }

    @Test
    void staffCanListAndFetchWithinOwnEcosystem() throws Exception {
        List<Map<String, Object>> fulfillments = getFulfillments(staffHeaders(), ecosystem.getId());

        assertThat(fulfillments).hasSize(2);
        assertThat(fulfillments)
                .extracting(item -> item.get("ecosystemId"))
                .containsOnly(ecosystem.getId().toString());
        assertThat(fulfillments)
                .extracting(item -> item.get("fulfillmentId"))
                .doesNotContain(otherFulfillment.getId().toString());

        ApiTestClient.ApiTestResponse detail = api.get(
                "/api/ecosystem/fulfillments/" + existingFulfillment.getId() + "?ecosystemId=" + ecosystem.getId(),
                staffHeaders()
        );
        assertThat(detail.status()).isEqualTo(200);
        assertThat(detail.body().get("fulfillmentId")).isEqualTo(existingFulfillment.getId().toString());
        assertThat(detail.body().get("status")).isEqualTo("DISPATCHED");
    }

    @Test
    void createUpdateAndIsolationRules() throws Exception {
        EcosystemOrder paidWithoutFulfillment = createOrder(ecosystem, true);

        ApiTestClient.ApiTestResponse createResponse = api.postJson(
                "/api/ecosystem/orders/" + paidWithoutFulfillment.getId() + "/fulfillment",
                Map.of(),
                adminHeaders()
        );
        assertThat(createResponse.status()).isEqualTo(201);
        String createdFulfillmentId = createResponse.body().get("fulfillmentId").toString();

        ApiTestClient.ApiTestResponse duplicateResponse = api.postJson(
                "/api/ecosystem/orders/" + paidWithoutFulfillment.getId() + "/fulfillment",
                Map.of(),
                adminHeaders()
        );
        assertThat(duplicateResponse.status()).isEqualTo(409);
        assertThat(errorCode(duplicateResponse)).isEqualTo("fulfillment_exists");

        ApiTestClient.ApiTestResponse unpaidResponse = api.postJson(
                "/api/ecosystem/orders/" + pendingOrder.getId() + "/fulfillment",
                Map.of(),
                adminHeaders()
        );
        assertThat(unpaidResponse.status()).isEqualTo(409);
        assertThat(errorCode(unpaidResponse)).isEqualTo("order_not_paid");

        ApiTestClient.ApiTestResponse forbiddenCreate = api.postJson(
                "/api/ecosystem/orders/" + paidWithoutFulfillment.getId() + "/fulfillment",
                Map.of(),
                staffHeaders()
        );
        assertThat(forbiddenCreate.status()).isEqualTo(403);
        assertThat(errorCode(forbiddenCreate)).isEqualTo("forbidden");

        ApiTestClient.ApiTestResponse crossDetail = api.get(
                "/api/ecosystem/fulfillments/" + otherFulfillment.getId() + "?ecosystemId=" + ecosystem.getId(),
                staffHeaders()
        );
        assertThat(crossDetail.status()).isEqualTo(404);
        assertThat(errorCode(crossDetail)).isEqualTo("fulfillment_not_found");

        ApiTestClient.ApiTestResponse updateResponse = api.patchJson(
                "/api/ecosystem/fulfillments/" + createdFulfillmentId + "/status",
                Map.of("status", "DISPATCHED"),
                staffHeaders()
        );
        assertThat(updateResponse.status()).isEqualTo(200);
        assertThat(updateResponse.body().get("status")).isEqualTo("DISPATCHED");

        ApiTestClient.ApiTestResponse invalidTransition = api.patchJson(
                "/api/ecosystem/fulfillments/" + createdFulfillmentId + "/status",
                Map.of("status", "PENDING"),
                staffHeaders()
        );
        assertThat(invalidTransition.status()).isEqualTo(409);
        assertThat(errorCode(invalidTransition)).isEqualTo("invalid_fulfillment_transition");

        ApiTestClient.ApiTestResponse otherEcosystemUpdate = api.patchJson(
                "/api/ecosystem/fulfillments/" + createdFulfillmentId + "/status",
                Map.of("status", "DELIVERED"),
                otherAdminHeaders()
        );
        assertThat(otherEcosystemUpdate.status()).isEqualTo(403);
        assertThat(errorCode(otherEcosystemUpdate)).isEqualTo("forbidden");
    }

    @Test
    void listSupportsCreatedAtDrilldownFilter() throws Exception {
        Instant targetTimestamp = Instant.parse("2026-03-15T12:00:00Z");
        setFulfillmentCreatedAt(existingFulfillment.getId(), targetTimestamp);
        List<Map<String, Object>> filtered = getFulfillments(
                staffHeaders(),
                ecosystem.getId(),
                targetTimestamp.minusSeconds(1).toString(),
                targetTimestamp.plusSeconds(1).toString()
        );

        assertThat(filtered).hasSize(1);
        assertThat(filtered.get(0).get("fulfillmentId")).isEqualTo(existingFulfillment.getId().toString());
    }

    private User createUser(String prefix) {
        return userRepository.save(new User(
                UUID.randomUUID(),
                prefix + "-" + UUID.randomUUID() + "@example.com",
                passwordEncoder.encode("secret"),
                UserStatus.ACTIVE
        ));
    }

    private EcosystemOrder createOrder(Ecosystem ecosystem, boolean paid) {
        EcosystemOrder order = EcosystemOrder.create(
                UUID.randomUUID(),
                ecosystem,
                "ARS",
                BigDecimal.TEN,
                BigDecimal.ZERO,
                "",
                null,
                null,
                BigDecimal.TEN,
                List.of(new EcosystemOrderItem(
                        UUID.randomUUID(),
                        UUID.randomUUID(),
                        1,
                        BigDecimal.TEN,
                        BigDecimal.TEN,
                        "{\"name\":\"Item\"}"
                ))
        );
        if (paid) {
            order.markPaid();
        }
        return ecosystemOrderRepository.save(order);
    }

    private HttpHeaders adminHeaders() throws Exception {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(loginAndGetAccessToken(adminUser.getEmail()));
        return headers;
    }

    private HttpHeaders otherAdminHeaders() throws Exception {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(loginAndGetAccessToken(otherAdminUser.getEmail()));
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

    private List<Map<String, Object>> getFulfillments(HttpHeaders headers, UUID ecosystemId) throws Exception {
        return getFulfillments(headers, ecosystemId, null, null);
    }

    private List<Map<String, Object>> getFulfillments(HttpHeaders headers, UUID ecosystemId, String createdFrom, String createdTo) throws Exception {
        StringBuilder path = new StringBuilder("/api/ecosystem/fulfillments?ecosystemId=" + ecosystemId);
        if (createdFrom != null) {
            path.append("&createdFrom=").append(createdFrom);
        }
        if (createdTo != null) {
            path.append("&createdTo=").append(createdTo);
        }
        MvcResult result = mockMvc.perform(get(path.toString()).headers(headers)).andReturn();
        assertThat(result.getResponse().getStatus()).isEqualTo(200);
        return MAPPER.readValue(result.getResponse().getContentAsString(StandardCharsets.UTF_8), new TypeReference<>() {});
    }

    private void setFulfillmentCreatedAt(UUID fulfillmentId, Instant timestamp) {
        jdbcTemplate.update(
                "update ecosystem_fulfillments set created_at = ? where id = ?",
                Timestamp.from(timestamp),
                fulfillmentId
        );
        entityManager.clear();
    }
}
