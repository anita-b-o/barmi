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
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@Testcontainers
@AutoConfigureMockMvc
class StoreBrandingAdminIT extends PostgresIntegrationTestBase {
    private static final ObjectMapper MAPPER = new ObjectMapper();

    private final ApiTestClient api;
    private final MockMvc mockMvc;
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

    @Autowired
    StoreBrandingAdminIT(
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
        store = storeRepository.save(new Store(UUID.randomUUID(), "branding-" + UUID.randomUUID(), "Branding Store"));
        otherStore = storeRepository.save(new Store(UUID.randomUUID(), "branding-other-" + UUID.randomUUID(), "Other Branding Store"));
        ownerEmail = "owner-" + UUID.randomUUID() + "@example.com";
        adminEmail = "admin-" + UUID.randomUUID() + "@example.com";
        staffEmail = "staff-" + UUID.randomUUID() + "@example.com";
        createUserAndMembership(store, ownerEmail, StoreMemberRole.OWNER);
        createUserAndMembership(store, adminEmail, StoreMemberRole.ADMIN);
        createUserAndMembership(store, staffEmail, StoreMemberRole.STAFF);
    }

    @Test
    void newStoresExposeDefaultBranding() throws Exception {
        ApiTestClient.ApiTestResponse response = api.get("/api/store/branding", authHeaders(store, ownerEmail));

        assertThat(response.status()).isEqualTo(200);
        assertThat(response.body().get("logoUrl")).isNull();
        assertThat(response.body().get("bannerUrl")).isNull();
        assertThat(response.body().get("primaryColor")).isEqualTo(Store.DEFAULT_PRIMARY_COLOR);
        assertThat(response.body().get("secondaryColor")).isEqualTo(Store.DEFAULT_SECONDARY_COLOR);
    }

    @Test
    void ownerAndAdminCanReadAndUpdateBrandingForCurrentStoreOnly() throws Exception {
        ApiTestClient.ApiTestResponse ownerGet = api.get("/api/store/branding", authHeaders(store, ownerEmail));
        assertThat(ownerGet.status()).isEqualTo(200);

        ApiTestClient.ApiTestResponse update = api.putJson(
                "/api/store/branding",
                Map.of(
                        "logoUrl", " https://cdn.example.test/logo.png ",
                        "bannerUrl", "https://cdn.example.test/banner.jpg",
                        "primaryColor", "#0f766e",
                        "secondaryColor", "#155e75"
                ),
                authHeaders(store, adminEmail)
        );

        assertThat(update.status()).isEqualTo(200);
        assertThat(update.body().get("logoUrl")).isEqualTo("https://cdn.example.test/logo.png");
        assertThat(update.body().get("bannerUrl")).isEqualTo("https://cdn.example.test/banner.jpg");
        assertThat(update.body().get("primaryColor")).isEqualTo("#0F766E");
        assertThat(update.body().get("secondaryColor")).isEqualTo("#155E75");

        Store saved = storeRepository.findById(store.getId()).orElseThrow();
        Store untouched = storeRepository.findById(otherStore.getId()).orElseThrow();
        assertThat(saved.getLogoUrl()).isEqualTo("https://cdn.example.test/logo.png");
        assertThat(saved.getPrimaryColor()).isEqualTo("#0F766E");
        assertThat(untouched.getLogoUrl()).isNull();
        assertThat(untouched.getPrimaryColor()).isEqualTo(Store.DEFAULT_PRIMARY_COLOR);
    }

    @Test
    void rejectsInvalidColorsLongUrlsAndStaff() throws Exception {
        ApiTestClient.ApiTestResponse invalidPrimary = api.putJson(
                "/api/store/branding",
                Map.of("primaryColor", "red", "secondaryColor", Store.DEFAULT_SECONDARY_COLOR),
                authHeaders(store, ownerEmail)
        );
        ApiTestClient.ApiTestResponse invalidSecondary = api.putJson(
                "/api/store/branding",
                Map.of("primaryColor", Store.DEFAULT_PRIMARY_COLOR, "secondaryColor", "#12345G"),
                authHeaders(store, ownerEmail)
        );
        ApiTestClient.ApiTestResponse tooLongUrl = api.putJson(
                "/api/store/branding",
                Map.of("logoUrl", "a".repeat(501)),
                authHeaders(store, ownerEmail)
        );
        ApiTestClient.ApiTestResponse staffGet = api.get("/api/store/branding", authHeaders(store, staffEmail));
        ApiTestClient.ApiTestResponse staffPut = api.putJson(
                "/api/store/branding",
                Map.of("primaryColor", "#111111", "secondaryColor", "#222222"),
                authHeaders(store, staffEmail)
        );

        assertThat(invalidPrimary.status()).isEqualTo(400);
        assertThat(errorCode(invalidPrimary)).isEqualTo("invalid_primary_color");
        assertThat(invalidSecondary.status()).isEqualTo(400);
        assertThat(errorCode(invalidSecondary)).isEqualTo("invalid_secondary_color");
        assertThat(tooLongUrl.status()).isEqualTo(400);
        assertThat(errorCode(tooLongUrl)).isEqualTo("logo_url_too_long");
        assertThat(staffGet.status()).isEqualTo(403);
        assertThat(staffPut.status()).isEqualTo(403);
    }

    @Test
    void publicStorePayloadIncludesBrandingForRequestedStoreOnly() throws Exception {
        api.putJson(
                "/api/store/branding",
                Map.of(
                        "logoUrl", "https://cdn.example.test/logo.svg",
                        "bannerUrl", "https://cdn.example.test/banner.png",
                        "primaryColor", "#7C3AED",
                        "secondaryColor", "#6D28D9"
                ),
                authHeaders(store, ownerEmail)
        );

        ApiTestClient.ApiTestResponse publicStore = api.get("/api/public/stores/" + store.getSlug(), null);

        assertThat(publicStore.status()).isEqualTo(200);
        Map<String, Object> branding = (Map<String, Object>) publicStore.body().get("branding");
        assertThat(branding.get("logoUrl")).isEqualTo("https://cdn.example.test/logo.svg");
        assertThat(branding.get("bannerUrl")).isEqualTo("https://cdn.example.test/banner.png");
        assertThat(branding.get("primaryColor")).isEqualTo("#7C3AED");
        assertThat(branding.get("secondaryColor")).isEqualTo("#6D28D9");
        assertThat(publicStore.rawBody()).doesNotContain(otherStore.getId().toString());
    }

    @Test
    void uploadsValidLogoAndPersistsUrlForCurrentStoreOnly() throws Exception {
        ApiTestClient.ApiTestResponse response = multipartAsset(
                "/api/store/assets/logo",
                "logo.png",
                "image/png",
                new byte[] {1, 2, 3},
                authHeaders(store, ownerEmail)
        );

        assertThat(response.status()).isEqualTo(200);
        assertThat(response.body().get("url")).isEqualTo("/uploads/stores/" + store.getId() + "/logo.png");

        Store saved = storeRepository.findById(store.getId()).orElseThrow();
        Store untouched = storeRepository.findById(otherStore.getId()).orElseThrow();
        assertThat(saved.getLogoUrl()).isEqualTo("/uploads/stores/" + store.getId() + "/logo.png");
        assertThat(saved.getBannerUrl()).isNull();
        assertThat(untouched.getLogoUrl()).isNull();
    }

    @Test
    void uploadsValidBannerAndKeepsExistingLogo() throws Exception {
        api.putJson(
                "/api/store/branding",
                Map.of(
                        "logoUrl", "https://cdn.example.test/logo.png",
                        "primaryColor", "#0F766E",
                        "secondaryColor", "#155E75"
                ),
                authHeaders(store, ownerEmail)
        );

        ApiTestClient.ApiTestResponse response = multipartAsset(
                "/api/store/assets/banner",
                "banner.jpg",
                "image/jpeg",
                new byte[] {4, 5, 6},
                authHeaders(store, ownerEmail)
        );

        assertThat(response.status()).isEqualTo(200);
        assertThat(response.body().get("url")).isEqualTo("/uploads/stores/" + store.getId() + "/banner.jpg");

        Store saved = storeRepository.findById(store.getId()).orElseThrow();
        assertThat(saved.getLogoUrl()).isEqualTo("https://cdn.example.test/logo.png");
        assertThat(saved.getBannerUrl()).isEqualTo("/uploads/stores/" + store.getId() + "/banner.jpg");
    }

    @Test
    void rejectsInvalidMimeTypeAndOversizedLogo() throws Exception {
        ApiTestClient.ApiTestResponse invalidMime = multipartAsset(
                "/api/store/assets/logo",
                "logo.svg",
                "image/svg+xml",
                "<svg></svg>".getBytes(StandardCharsets.UTF_8),
                authHeaders(store, ownerEmail)
        );
        ApiTestClient.ApiTestResponse oversizedLogo = multipartAsset(
                "/api/store/assets/logo",
                "logo.png",
                "image/png",
                new byte[(5 * 1024 * 1024) + 1],
                authHeaders(store, ownerEmail)
        );

        assertThat(invalidMime.status()).isEqualTo(400);
        assertThat(errorCode(invalidMime)).isEqualTo("unsupported_image_type");
        assertThat(oversizedLogo.status()).isEqualTo(400);
        assertThat(errorCode(oversizedLogo)).isEqualTo("logo_too_large");
    }

    @Test
    void rejectsUnauthorizedAssetUpload() throws Exception {
        ApiTestClient.ApiTestResponse staffUpload = multipartAsset(
                "/api/store/assets/banner",
                "banner.webp",
                "image/webp",
                new byte[] {7, 8, 9},
                authHeaders(store, staffEmail)
        );

        assertThat(staffUpload.status()).isEqualTo(403);
        assertThat(errorCode(staffUpload)).isEqualTo("forbidden");
    }

    private void createUserAndMembership(Store targetStore, String email, StoreMemberRole role) {
        userRepository.save(new User(UUID.randomUUID(), email, passwordEncoder.encode("secret"), UserStatus.ACTIVE));
        storeMemberRepository.save(new StoreMember(UUID.randomUUID(), targetStore.getId(), email, role, StoreMemberStatus.ACTIVE));
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

    private String errorCode(ApiTestClient.ApiTestResponse response) {
        return ((Map<String, Object>) response.body().get("error")).get("code").toString();
    }

    private ApiTestClient.ApiTestResponse multipartAsset(
            String path,
            String filename,
            String contentType,
            byte[] content,
            HttpHeaders headers
    ) throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", filename, contentType, content);
        MvcResult result = mockMvc.perform(MockMvcRequestBuilders.multipart(path)
                        .file(file)
                        .headers(headers))
                .andReturn();
        String rawBody = result.getResponse().getContentAsString(StandardCharsets.UTF_8);
        Map<String, Object> body = rawBody == null || rawBody.isBlank()
                ? null
                : MAPPER.readValue(rawBody, new TypeReference<>() {});
        return new ApiTestClient.ApiTestResponse(
                result.getResponse().getStatus(),
                body,
                rawBody,
                new HttpHeaders(),
                result.getResponse().getCookies()
        );
    }
}
