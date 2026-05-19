package com.barmi.fulfillment;

import com.barmi.PostgresIntegrationTestBase;
import com.barmi.domain.fulfillment.FulfillmentStatus;
import com.barmi.domain.fulfillment.StoreFulfillment;
import com.barmi.domain.orders.StoreOrder;
import com.barmi.domain.orders.StoreOrderItem;
import com.barmi.domain.store.Store;
import com.barmi.domain.store.StoreMember;
import com.barmi.domain.store.StoreMemberRole;
import com.barmi.domain.store.StoreMemberStatus;
import com.barmi.domain.users.User;
import com.barmi.domain.users.UserStatus;
import com.barmi.infra.repo.RefreshTokenRepository;
import com.barmi.infra.repo.StoreFulfillmentRepository;
import com.barmi.infra.repo.StoreMemberRepository;
import com.barmi.infra.repo.StoreOrderRepository;
import com.barmi.infra.repo.StoreRepository;
import com.barmi.infra.repo.UserRepository;
import com.barmi.testsupport.ApiTestClient;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
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
class StoreFulfillmentQueryIT extends PostgresIntegrationTestBase {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private final MockMvc mockMvc;
    private final ApiTestClient api;
    private final StoreRepository storeRepository;
    private final StoreFulfillmentRepository storeFulfillmentRepository;
    private final StoreMemberRepository storeMemberRepository;
    private final StoreOrderRepository storeOrderRepository;
    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JdbcTemplate jdbcTemplate;

    private Store store;
    private Store otherStore;
    private String ownerEmail;
    private String adminEmail;
    private String staffEmail;
    private StoreFulfillment newestFulfillment;
    private StoreFulfillment olderFulfillment;
    private StoreFulfillment otherStoreFulfillment;

    @Autowired
    StoreFulfillmentQueryIT(
            MockMvc mockMvc,
            StoreRepository storeRepository,
            StoreFulfillmentRepository storeFulfillmentRepository,
            StoreMemberRepository storeMemberRepository,
            StoreOrderRepository storeOrderRepository,
            UserRepository userRepository,
            RefreshTokenRepository refreshTokenRepository,
            PasswordEncoder passwordEncoder,
            JdbcTemplate jdbcTemplate
    ) {
        this.mockMvc = mockMvc;
        this.api = new ApiTestClient(mockMvc);
        this.storeRepository = storeRepository;
        this.storeFulfillmentRepository = storeFulfillmentRepository;
        this.storeMemberRepository = storeMemberRepository;
        this.storeOrderRepository = storeOrderRepository;
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.jdbcTemplate = jdbcTemplate;
    }

    @BeforeEach
    void setup() {
        truncateAllTables(jdbcTemplate);

        store = storeRepository.save(new Store(UUID.randomUUID(), "fulfillments-" + UUID.randomUUID(), "Fulfillment Store"));
        otherStore = storeRepository.save(new Store(UUID.randomUUID(), "other-" + UUID.randomUUID(), "Other Store"));

        ownerEmail = "owner-" + UUID.randomUUID() + "@example.com";
        adminEmail = "admin-" + UUID.randomUUID() + "@example.com";
        staffEmail = "staff-" + UUID.randomUUID() + "@example.com";

        createUserAndMembership(ownerEmail, StoreMemberRole.OWNER);
        createUserAndMembership(adminEmail, StoreMemberRole.ADMIN);
        createUserAndMembership(staffEmail, StoreMemberRole.STAFF);

        StoreOrder olderOrder = createOrder(store.getId());
        StoreOrder newestOrder = createOrder(store.getId());
        StoreOrder otherStoreOrder = createOrder(otherStore.getId());

        olderFulfillment = storeFulfillmentRepository.save(new StoreFulfillment(
                UUID.randomUUID(),
                olderOrder.getId(),
                store.getId(),
                "DELIVERY",
                FulfillmentStatus.PENDING
        ));
        newestFulfillment = storeFulfillmentRepository.save(new StoreFulfillment(
                UUID.randomUUID(),
                newestOrder.getId(),
                store.getId(),
                "DELIVERY",
                FulfillmentStatus.DISPATCHED
        ));
        otherStoreFulfillment = storeFulfillmentRepository.save(new StoreFulfillment(
                UUID.randomUUID(),
                otherStoreOrder.getId(),
                otherStore.getId(),
                "DELIVERY",
                FulfillmentStatus.CANCELLED
        ));
    }

    @Test
    void staffCanListFulfillmentsForCurrentStore() throws Exception {
        List<Map<String, Object>> fulfillments = getFulfillments(authHeaders(staffEmail, store.getSlug()));

        assertThat(fulfillments).hasSize(2);
        assertThat(fulfillments.get(0).get("fulfillmentId")).isEqualTo(newestFulfillment.getId().toString());
        assertThat(fulfillments.get(1).get("fulfillmentId")).isEqualTo(olderFulfillment.getId().toString());
    }

    @Test
    void adminCanListFulfillments() throws Exception {
        List<Map<String, Object>> fulfillments = getFulfillments(authHeaders(adminEmail, store.getSlug()));

        assertThat(fulfillments).hasSize(2);
    }

    @Test
    void ownerCanListFulfillments() throws Exception {
        List<Map<String, Object>> fulfillments = getFulfillments(authHeaders(ownerEmail, store.getSlug()));

        assertThat(fulfillments).hasSize(2);
    }

    @Test
    void listingOnlyReturnsFulfillmentsForCurrentTenantStore() throws Exception {
        List<Map<String, Object>> fulfillments = getFulfillments(authHeaders(adminEmail, store.getSlug()));

        assertThat(fulfillments)
                .extracting(item -> item.get("storeId"))
                .containsOnly(store.getId().toString());
        assertThat(fulfillments)
                .extracting(item -> item.get("fulfillmentId"))
                .doesNotContain(otherStoreFulfillment.getId().toString());
    }

    @Test
    void staffCanFetchFulfillmentDetailWithinStore() throws Exception {
        ApiTestClient.ApiTestResponse response = api.get(
                "/api/store/fulfillments/" + newestFulfillment.getId(),
                authHeaders(staffEmail, store.getSlug())
        );

        assertThat(response.status()).isEqualTo(200);
        assertThat(response.body().get("fulfillmentId")).isEqualTo(newestFulfillment.getId().toString());
        assertThat(response.body().get("storeId")).isEqualTo(store.getId().toString());
        assertThat(response.body().get("status")).isEqualTo("DISPATCHED");
    }

    @Test
    void fetchingFulfillmentFromAnotherStoreReturnsNotFound() throws Exception {
        ApiTestClient.ApiTestResponse response = api.get(
                "/api/store/fulfillments/" + otherStoreFulfillment.getId(),
                authHeaders(staffEmail, store.getSlug())
        );

        assertThat(response.status()).isEqualTo(404);
        assertThat(errorCode(response)).isEqualTo("fulfillment_not_found");
    }

    @Test
    void missingTenantContextReturnsStoreContextRequired() throws Exception {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(loginAndGetAccessToken(staffEmail));

        ApiTestClient.ApiTestResponse response = api.get("/api/store/fulfillments", headers);

        assertThat(response.status()).isEqualTo(400);
        assertThat(errorCode(response)).isEqualTo("store_context_required");
    }

    @Test
    void listSupportsCreatedAtDrillDownFilters() throws Exception {
        Instant now = Instant.now();
        jdbcTemplate.update("update store_fulfillments set created_at = ? where id = ?", Timestamp.from(now.minusSeconds(3 * 24L * 60L * 60L)), newestFulfillment.getId());
        jdbcTemplate.update("update store_fulfillments set created_at = ? where id = ?", Timestamp.from(now.minusSeconds(10 * 24L * 60L * 60L)), olderFulfillment.getId());

        MvcResult result = mockMvc.perform(get("/api/store/fulfillments?createdFrom=%s&createdTo=%s".formatted(
                now.minusSeconds(7 * 24L * 60L * 60L),
                now
        )).headers(authHeaders(staffEmail, store.getSlug()))).andReturn();

        assertThat(result.getResponse().getStatus()).isEqualTo(200);
        List<Map<String, Object>> fulfillments = MAPPER.readValue(
                result.getResponse().getContentAsString(StandardCharsets.UTF_8),
                new TypeReference<>() {}
        );
        assertThat(fulfillments).extracting(item -> item.get("fulfillmentId").toString())
                .containsExactly(newestFulfillment.getId().toString());
    }

    private void createUserAndMembership(String email, StoreMemberRole role) {
        userRepository.save(new User(
                UUID.randomUUID(),
                email,
                passwordEncoder.encode("secret"),
                UserStatus.ACTIVE
        ));
        storeMemberRepository.save(new StoreMember(
                UUID.randomUUID(),
                store.getId(),
                email,
                role,
                StoreMemberStatus.ACTIVE
        ));
    }

    private StoreOrder createOrder(UUID storeId) {
        UUID orderId = UUID.randomUUID();
        StoreOrderItem item = new StoreOrderItem(
                UUID.randomUUID(),
                orderId,
                UUID.randomUUID(),
                1,
                BigDecimal.TEN,
                BigDecimal.TEN,
                "ARS",
                "{\"name\":\"Test item\"}"
        );
        return storeOrderRepository.save(StoreOrder.create(
                orderId,
                storeId,
                "ARS",
                BigDecimal.TEN,
                BigDecimal.TEN,
                BigDecimal.ZERO,
                "",
                null,
                null,
                List.of(item)
        ));
    }

    private HttpHeaders authHeaders(String email, String slug) throws Exception {
        HttpHeaders headers = api.storeHostHeaders(slug);
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

    private List<Map<String, Object>> getFulfillments(HttpHeaders headers) throws Exception {
        MvcResult result = mockMvc.perform(get("/api/store/fulfillments").headers(headers)).andReturn();
        assertThat(result.getResponse().getStatus()).isEqualTo(200);
        return MAPPER.readValue(
                result.getResponse().getContentAsString(StandardCharsets.UTF_8),
                new TypeReference<>() {}
        );
    }
}
