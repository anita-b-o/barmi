package com.barmi.saas;

import com.barmi.PostgresIntegrationTestBase;
import com.barmi.domain.saas.SaasSubscriptionStatus;
import com.barmi.domain.store.Store;
import com.barmi.domain.users.User;
import com.barmi.domain.users.UserStatus;
import com.barmi.infra.repo.SaasPlanRepository;
import com.barmi.infra.repo.SaasSubscriptionRepository;
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

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

@Testcontainers
@AutoConfigureMockMvc
class SaasAdminIT extends PostgresIntegrationTestBase {
    private static final ObjectMapper MAPPER = new ObjectMapper();

    private final ApiTestClient api;
    private final MockMvc mockMvc;
    private final StoreRepository storeRepository;
    private final UserRepository userRepository;
    private final SaasPlanRepository saasPlanRepository;
    private final SaasSubscriptionRepository saasSubscriptionRepository;
    private final PasswordEncoder passwordEncoder;
    private final JdbcTemplate jdbcTemplate;

    private String adminEmail;

    @Autowired
    SaasAdminIT(
            MockMvc mockMvc,
            StoreRepository storeRepository,
            UserRepository userRepository,
            SaasPlanRepository saasPlanRepository,
            SaasSubscriptionRepository saasSubscriptionRepository,
            PasswordEncoder passwordEncoder,
            JdbcTemplate jdbcTemplate
    ) {
        this.mockMvc = mockMvc;
        this.api = new ApiTestClient(mockMvc);
        this.storeRepository = storeRepository;
        this.userRepository = userRepository;
        this.saasPlanRepository = saasPlanRepository;
        this.saasSubscriptionRepository = saasSubscriptionRepository;
        this.passwordEncoder = passwordEncoder;
        this.jdbcTemplate = jdbcTemplate;
    }

    @BeforeEach
    void setup() {
        truncateAllTables(jdbcTemplate);
        jdbcTemplate.update("DELETE FROM saas_plans WHERE code <> 'FREE'");
        adminEmail = "saas-admin-" + UUID.randomUUID() + "@example.com";
        userRepository.save(new User(
                UUID.randomUUID(),
                adminEmail,
                passwordEncoder.encode("secret"),
                UserStatus.ACTIVE
        ));
    }

    @Test
    void storeInsertCreatesFreeActiveSubscription() {
        Store store = storeRepository.save(new Store(UUID.randomUUID(), "saas-store-" + UUID.randomUUID(), "SaaS Store"));

        assertThat(saasSubscriptionRepository.findByStoreId(store.getId())).isPresent()
                .get()
                .satisfies(subscription -> {
                    assertThat(subscription.getPlan().getCode()).isEqualTo("FREE");
                    assertThat(subscription.getStatus()).isEqualTo(SaasSubscriptionStatus.ACTIVE);
                });
    }

    @Test
    void listsPlansAndSubscriptionsAndChangesStorePlan() throws Exception {
        Store store = storeRepository.save(new Store(UUID.randomUUID(), "saas-change-" + UUID.randomUUID(), "SaaS Change"));
        HttpHeaders headers = authHeaders();

        List<Map<String, Object>> planItems = getList("/api/admin/saas/plans", headers);
        assertThat(planItems).extracting(item -> item.get("code")).contains("FREE");

        ApiTestClient.ApiTestResponse createPlan = api.postJson(
                "/api/admin/saas/plans",
                Map.of(
                        "code", "PRO",
                        "name", "Pro",
                        "active", true,
                        "description", "Plan pro",
                        "maxProducts", 200,
                        "analyticsEnabled", true,
                        "seoEnabled", true
                ),
                headers
        );
        assertThat(createPlan.status()).isEqualTo(201);
        assertThat(createPlan.body().get("code")).isEqualTo("PRO");

        String proPlanId = createPlan.body().get("id").toString();
        ApiTestClient.ApiTestResponse updatePlan = api.putJson(
                "/api/admin/saas/plans/" + proPlanId,
                Map.of(
                        "name", "Pro Plus",
                        "active", true,
                        "description", "Plan pro plus",
                        "maxProducts", 250,
                        "analyticsEnabled", true,
                        "seoEnabled", true
                ),
                headers
        );
        assertThat(updatePlan.status()).isEqualTo(200);
        assertThat(updatePlan.body().get("name")).isEqualTo("Pro Plus");
        assertThat(updatePlan.body().get("maxProducts")).isEqualTo(250);

        ApiTestClient.ApiTestResponse changePlan = api.patchJson(
                "/api/admin/saas/subscriptions/stores/" + store.getId() + "/plan",
                Map.of("planCode", "PRO"),
                headers
        );
        assertThat(changePlan.status()).isEqualTo(200);
        assertThat(changePlan.body().get("storeId")).isEqualTo(store.getId().toString());
        assertThat(changePlan.body().get("planCode")).isEqualTo("PRO");
        assertThat(changePlan.body().get("status")).isEqualTo("ACTIVE");

        List<Map<String, Object>> subscriptionItems = getList("/api/admin/saas/subscriptions", headers);
        assertThat(subscriptionItems).hasSize(1);
        assertThat(subscriptionItems.get(0).get("storeSlug")).isEqualTo(store.getSlug());
        assertThat(subscriptionItems.get(0).get("planCode")).isEqualTo("PRO");
        assertThat(saasSubscriptionRepository.findAll()).hasSize(1);
    }

    private HttpHeaders authHeaders() throws Exception {
        ApiTestClient.ApiTestResponse login = api.postJson(
                "/api/auth/login",
                Map.of("email", adminEmail, "password", "secret"),
                null
        );
        assertThat(login.status()).isEqualTo(200);
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(login.body().get("accessToken").toString());
        return headers;
    }

    private List<Map<String, Object>> getList(String path, HttpHeaders headers) throws Exception {
        MvcResult result = mockMvc.perform(get(path).headers(headers)).andReturn();
        assertThat(result.getResponse().getStatus()).isEqualTo(200);
        return MAPPER.readValue(
                result.getResponse().getContentAsString(StandardCharsets.UTF_8),
                new TypeReference<>() {}
        );
    }
}
