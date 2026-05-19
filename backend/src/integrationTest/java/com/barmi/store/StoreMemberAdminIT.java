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
class StoreMemberAdminIT extends PostgresIntegrationTestBase {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private final ApiTestClient api;
    private final MockMvc mockMvc;
    private final StoreRepository storeRepository;
    private final StoreMemberRepository storeMemberRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JdbcTemplate jdbcTemplate;

    private Store store;
    private String ownerEmail;
    private String adminEmail;
    private String staffEmail;

    @Autowired
    StoreMemberAdminIT(
            MockMvc mockMvc,
            StoreRepository storeRepository,
            StoreMemberRepository storeMemberRepository,
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JdbcTemplate jdbcTemplate
    ) {
        this.mockMvc = mockMvc;
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

        store = storeRepository.save(new Store(UUID.randomUUID(), "members-" + UUID.randomUUID(), "Members Store"));

        ownerEmail = "owner-" + UUID.randomUUID() + "@example.com";
        adminEmail = "admin-" + UUID.randomUUID() + "@example.com";
        staffEmail = "staff-" + UUID.randomUUID() + "@example.com";

        createUserAndMembership(ownerEmail, StoreMemberRole.OWNER, StoreMemberStatus.ACTIVE);
        createUserAndMembership(adminEmail, StoreMemberRole.ADMIN, StoreMemberStatus.ACTIVE);
        createUserAndMembership(staffEmail, StoreMemberRole.STAFF, StoreMemberStatus.ACTIVE);
    }

    @Test
    void ownerCanListMembers() throws Exception {
        List<Map<String, Object>> response = getMembers(authHeaders(ownerEmail));

        assertThat(response).hasSize(3);
    }

    @Test
    void adminCanListMembers() throws Exception {
        List<Map<String, Object>> members = getMembers(authHeaders(adminEmail));

        assertThat(members).hasSize(3);
        Map<String, Object> first = members.get(0);
        assertThat(first.get("storeSlug")).isEqualTo(store.getSlug());
    }

    @Test
    void staffCannotListMembers() throws Exception {
        MvcResult result = mockMvc.perform(get("/api/store/members").headers(authHeaders(staffEmail))).andReturn();
        ApiTestClient.ApiTestResponse response = new ApiTestClient.ApiTestResponse(
                result.getResponse().getStatus(),
                MAPPER.readValue(result.getResponse().getContentAsString(StandardCharsets.UTF_8), new TypeReference<>() {}),
                result.getResponse().getContentAsString(StandardCharsets.UTF_8),
                new HttpHeaders(),
                result.getResponse().getCookies()
        );

        assertThat(response.status()).isEqualTo(403);
        assertThat(errorCode(response)).isEqualTo("forbidden");
    }

    @Test
    void ownerCanCreateStaffMembership() throws Exception {
        createUser("newstaff@example.com");

        ApiTestClient.ApiTestResponse response = api.postJson(
                "/api/store/members",
                Map.of("memberEmail", "newstaff@example.com", "role", "STAFF"),
                authHeaders(ownerEmail)
        );

        assertThat(response.status()).isEqualTo(201);
        assertThat(response.body().get("memberEmail")).isEqualTo("newstaff@example.com");
        assertThat(response.body().get("role")).isEqualTo("STAFF");
        assertThat(storeMemberRepository.findByStoreIdAndMemberEmail(store.getId(), "newstaff@example.com")).isPresent();
    }

    @Test
    void adminCannotCreateOwnerMembership() throws Exception {
        createUser("newowner@example.com");

        ApiTestClient.ApiTestResponse response = api.postJson(
                "/api/store/members",
                Map.of("memberEmail", "newowner@example.com", "role", "OWNER"),
                authHeaders(adminEmail)
        );

        assertThat(response.status()).isEqualTo(409);
        assertThat(errorCode(response)).isEqualTo("cannot_assign_owner");
    }

    @Test
    void postReactivatesInactiveMembership() throws Exception {
        createUser("reactivate@example.com");
        StoreMember inactiveMember = storeMemberRepository.save(new StoreMember(
                UUID.randomUUID(),
                store.getId(),
                "reactivate@example.com",
                StoreMemberRole.STAFF,
                StoreMemberStatus.INACTIVE
        ));

        ApiTestClient.ApiTestResponse response = api.postJson(
                "/api/store/members",
                Map.of("memberEmail", "reactivate@example.com", "role", "ADMIN"),
                authHeaders(ownerEmail)
        );

        assertThat(response.status()).isEqualTo(201);
        assertThat(response.body().get("memberId")).isEqualTo(inactiveMember.getId().toString());
        assertThat(response.body().get("status")).isEqualTo("ACTIVE");
        assertThat(response.body().get("role")).isEqualTo("ADMIN");
    }

    @Test
    void postConflictsWhenMembershipAlreadyActive() throws Exception {
        ApiTestClient.ApiTestResponse response = api.postJson(
                "/api/store/members",
                Map.of("memberEmail", staffEmail, "role", "STAFF"),
                authHeaders(ownerEmail)
        );

        assertThat(response.status()).isEqualTo(409);
        assertThat(errorCode(response)).isEqualTo("member_already_exists");
    }

    @Test
    void adminCannotManageOwnerMembership() throws Exception {
        UUID ownerMemberId = storeMemberRepository.findByStoreIdAndMemberEmail(store.getId(), ownerEmail).orElseThrow().getId();

        ApiTestClient.ApiTestResponse response = api.patchJson(
                "/api/store/members/" + ownerMemberId + "/status",
                Map.of("status", "INACTIVE"),
                authHeaders(adminEmail)
        );

        assertThat(response.status()).isEqualTo(409);
        assertThat(errorCode(response)).isEqualTo("cannot_manage_owner");
    }

    @Test
    void cannotDeactivateLastActiveOwner() throws Exception {
        UUID ownerMemberId = storeMemberRepository.findByStoreIdAndMemberEmail(store.getId(), ownerEmail).orElseThrow().getId();

        ApiTestClient.ApiTestResponse response = api.patchJson(
                "/api/store/members/" + ownerMemberId + "/status",
                Map.of("status", "INACTIVE"),
                authHeaders(ownerEmail)
        );

        assertThat(response.status()).isEqualTo(409);
        assertThat(errorCode(response)).isEqualTo("cannot_remove_last_owner");
    }

    @Test
    void cannotDemoteLastActiveOwner() throws Exception {
        UUID ownerMemberId = storeMemberRepository.findByStoreIdAndMemberEmail(store.getId(), ownerEmail).orElseThrow().getId();

        ApiTestClient.ApiTestResponse response = api.patchJson(
                "/api/store/members/" + ownerMemberId + "/role",
                Map.of("role", "ADMIN"),
                authHeaders(ownerEmail)
        );

        assertThat(response.status()).isEqualTo(409);
        assertThat(errorCode(response)).isEqualTo("cannot_remove_last_owner");
    }

    @Test
    void patchRoleWorksForAllowedTransition() throws Exception {
        UUID staffMemberId = storeMemberRepository.findByStoreIdAndMemberEmail(store.getId(), staffEmail).orElseThrow().getId();

        ApiTestClient.ApiTestResponse response = api.patchJson(
                "/api/store/members/" + staffMemberId + "/role",
                Map.of("role", "ADMIN"),
                authHeaders(ownerEmail)
        );

        assertThat(response.status()).isEqualTo(200);
        assertThat(response.body().get("role")).isEqualTo("ADMIN");
    }

    @Test
    void patchStatusWorksForAllowedTransition() throws Exception {
        UUID staffMemberId = storeMemberRepository.findByStoreIdAndMemberEmail(store.getId(), staffEmail).orElseThrow().getId();

        ApiTestClient.ApiTestResponse response = api.patchJson(
                "/api/store/members/" + staffMemberId + "/status",
                Map.of("status", "INACTIVE"),
                authHeaders(ownerEmail)
        );

        assertThat(response.status()).isEqualTo(200);
        assertThat(response.body().get("status")).isEqualTo("INACTIVE");
    }

    private void createUser(String email) {
        userRepository.save(new User(
                UUID.randomUUID(),
                email,
                passwordEncoder.encode("secret"),
                UserStatus.ACTIVE
        ));
    }

    private void createUserAndMembership(String email, StoreMemberRole role, StoreMemberStatus status) {
        createUser(email);
        storeMemberRepository.save(new StoreMember(
                UUID.randomUUID(),
                store.getId(),
                email,
                role,
                status
        ));
    }

    private HttpHeaders authHeaders(String email) throws Exception {
        HttpHeaders headers = api.storeHostHeaders(store.getSlug());
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

    private List<Map<String, Object>> getMembers(HttpHeaders headers) throws Exception {
        MvcResult result = mockMvc.perform(get("/api/store/members").headers(headers)).andReturn();
        assertThat(result.getResponse().getStatus()).isEqualTo(200);
        return MAPPER.readValue(
                result.getResponse().getContentAsString(StandardCharsets.UTF_8),
                new TypeReference<>() {}
        );
    }
}
