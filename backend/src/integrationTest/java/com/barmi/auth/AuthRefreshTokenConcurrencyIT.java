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
import com.barmi.infra.repo.EcosystemRepository;
import com.barmi.infra.repo.RefreshTokenRepository;
import com.barmi.infra.repo.StoreMemberRepository;
import com.barmi.infra.repo.StoreRepository;
import com.barmi.infra.repo.UserRepository;
import com.barmi.testsupport.ApiTestClient;
import jakarta.servlet.http.Cookie;
import org.assertj.core.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.aop.framework.ProxyFactory;
import org.springframework.beans.BeansException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.config.BeanPostProcessor;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpHeaders;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

@Testcontainers
@AutoConfigureMockMvc
@ExtendWith(OutputCaptureExtension.class)
@Import(AuthRefreshTokenConcurrencyIT.ConcurrencyHarnessConfig.class)
class AuthRefreshTokenConcurrencyIT extends PostgresIntegrationTestBase {

    private static final Logger log = LoggerFactory.getLogger(AuthRefreshTokenConcurrencyIT.class);

    private final ApiTestClient api;
    private final UserRepository userRepository;
    private final StoreRepository storeRepository;
    private final StoreMemberRepository storeMemberRepository;
    private final EcosystemRepository ecosystemRepository;
    private final EcosystemMemberRepository ecosystemMemberRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JdbcTemplate jdbcTemplate;
    private final RefreshTokenRaceHarness raceHarness;

    private User activeUser;

    @Autowired
    AuthRefreshTokenConcurrencyIT(
            MockMvc mockMvc,
            UserRepository userRepository,
            StoreRepository storeRepository,
            StoreMemberRepository storeMemberRepository,
            EcosystemRepository ecosystemRepository,
            EcosystemMemberRepository ecosystemMemberRepository,
            RefreshTokenRepository refreshTokenRepository,
            PasswordEncoder passwordEncoder,
            JdbcTemplate jdbcTemplate,
            RefreshTokenRaceHarness raceHarness
    ) {
        this.api = new ApiTestClient(mockMvc);
        this.userRepository = userRepository;
        this.storeRepository = storeRepository;
        this.storeMemberRepository = storeMemberRepository;
        this.ecosystemRepository = ecosystemRepository;
        this.ecosystemMemberRepository = ecosystemMemberRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.jdbcTemplate = jdbcTemplate;
        this.raceHarness = raceHarness;
    }

    @BeforeEach
    void setup() {
        truncateAllTables(jdbcTemplate);
        raceHarness.reset();

        String email = "admin-" + UUID.randomUUID() + "@example.com";
        activeUser = new User(
                UUID.randomUUID(),
                email,
                passwordEncoder.encode("secret"),
                UserStatus.ACTIVE
        );
        userRepository.save(activeUser);

        Store store = new Store(UUID.randomUUID(), "demo-store-" + UUID.randomUUID(), "Demo Store");
        storeRepository.save(store);

        Ecosystem ecosystem = new Ecosystem(UUID.randomUUID(), "Demo Eco", "demo-ecosystem-" + UUID.randomUUID());
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
    void refreshParallelAgainstSameTokenReturnsCleanUnauthorizedLoser(CapturedOutput output) throws Exception {
        Cookie refreshCookie = loginAndRequireRefreshCookie();
        String loserRequestId = "refresh-loser";
        String winnerRequestId = "refresh-winner";

        raceHarness.blockAfterFindByTokenHash(loserRequestId);

        CompletableFuture<ApiTestClient.ApiTestResponse> loser = CompletableFuture.supplyAsync(() -> doRefresh(refreshCookie, loserRequestId));

        assertThat(raceHarness.awaitLoserLoaded()).isTrue();

        ApiTestClient.ApiTestResponse winner = doRefresh(refreshCookie, winnerRequestId);
        raceHarness.releaseLoser();

        ApiTestClient.ApiTestResponse loserResponse = loser.get(10, TimeUnit.SECONDS);

        log.info("diagnostic_result scenario=refresh_vs_refresh winner_status={} loser_status={}",
                winner.status(), loserResponse.status());

        assertThat(winner.status()).isEqualTo(200);
        assertThat(loserResponse.status()).isEqualTo(401);
        assertThat(errorCode(loserResponse)).isEqualTo("invalid_refresh_token");
        assertThat(activeTokenCount()).isEqualTo(1);
        assertThat(output.getOut()).doesNotContain("StaleObjectStateException");
    }

    @Test
    void loginWhileRefreshHasLoadedSameTokenReturnsCleanUnauthorizedLoser(CapturedOutput output) throws Exception {
        Cookie refreshCookie = loginAndRequireRefreshCookie();
        String refreshRequestId = "refresh-loser";
        String loginRequestId = "login-winner";

        raceHarness.blockAfterFindByTokenHash(refreshRequestId);

        CompletableFuture<ApiTestClient.ApiTestResponse> refresh = CompletableFuture.supplyAsync(() -> doRefresh(refreshCookie, refreshRequestId));

        assertThat(raceHarness.awaitLoserLoaded()).isTrue();

        ApiTestClient.ApiTestResponse login = doLogin(activeUser.getEmail(), "secret", loginRequestId);
        raceHarness.releaseLoser();

        ApiTestClient.ApiTestResponse refreshResponse = refresh.get(10, TimeUnit.SECONDS);

        log.info("diagnostic_result scenario=login_vs_refresh login_status={} refresh_status={}",
                login.status(), refreshResponse.status());

        assertThat(login.status()).isEqualTo(200);
        assertThat(refreshResponse.status()).isEqualTo(401);
        assertThat(errorCode(refreshResponse)).isEqualTo("invalid_refresh_token");
        assertThat(activeTokenCount()).isEqualTo(1);
        assertThat(output.getOut()).doesNotContain("StaleObjectStateException");
    }

    @Test
    void loginParallelAfterRevokingSameActiveTokenAllowsSingleWinner(CapturedOutput output) throws Exception {
        loginAndRequireRefreshCookie();
        String loserRequestId = "login-loser";
        String winnerRequestId = "login-winner";

        raceHarness.blockAfterFindUserByEmail(loserRequestId);

        CompletableFuture<ApiTestClient.ApiTestResponse> loser = CompletableFuture.supplyAsync(
                () -> doLogin(activeUser.getEmail(), "secret", loserRequestId)
        );

        assertThat(raceHarness.awaitLoserLoaded()).isTrue();

        ApiTestClient.ApiTestResponse winner = doLogin(activeUser.getEmail(), "secret", winnerRequestId);
        raceHarness.releaseLoser();

        ApiTestClient.ApiTestResponse loserResponse = loser.get(10, TimeUnit.SECONDS);

        log.info("diagnostic_result scenario=login_vs_login winner_status={} loser_status={}",
                winner.status(), loserResponse.status());

        assertThat(winner.status()).isEqualTo(200);
        assertThat(loserResponse.status()).isEqualTo(409);
        assertThat(errorCode(loserResponse)).isEqualTo("concurrent_auth_request");
        assertThat(activeTokenCount()).isEqualTo(1);
        assertThat(output.getOut()).doesNotContain("StaleObjectStateException");
    }

    @Test
    void logoutWhileRefreshHasLoadedSameTokenReturnsCleanUnauthorizedLoser(CapturedOutput output) throws Exception {
        Cookie refreshCookie = loginAndRequireRefreshCookie();
        String refreshRequestId = "refresh-loser";
        String logoutRequestId = "logout-winner";

        raceHarness.blockAfterFindByTokenHash(refreshRequestId);

        CompletableFuture<ApiTestClient.ApiTestResponse> refresh = CompletableFuture.supplyAsync(() -> doRefresh(refreshCookie, refreshRequestId));

        assertThat(raceHarness.awaitLoserLoaded()).isTrue();

        ApiTestClient.ApiTestResponse logout = doLogout(refreshCookie, logoutRequestId);
        raceHarness.releaseLoser();

        ApiTestClient.ApiTestResponse refreshResponse = refresh.get(10, TimeUnit.SECONDS);

        log.info("diagnostic_result scenario=logout_vs_refresh logout_status={} refresh_status={}",
                logout.status(), refreshResponse.status());

        assertThat(logout.status()).isEqualTo(200);
        assertThat(refreshResponse.status()).isEqualTo(401);
        assertThat(errorCode(refreshResponse)).isEqualTo("invalid_refresh_token");
        assertThat(activeTokenCount()).isZero();
        Assertions.assertThat(output.getOut()).doesNotContain("StaleObjectStateException");
    }

    private Cookie loginAndRequireRefreshCookie() throws Exception {
        ApiTestClient.ApiTestResponse login = doLogin(activeUser.getEmail(), "secret", "seed-login");
        assertThat(login.status()).isEqualTo(200);
        assertThat(refreshTokenRepository.findAll()).hasSize(1);
        return requireRefreshCookie(login);
    }

    private ApiTestClient.ApiTestResponse doLogin(String email, String password, String requestId) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("X-Request-Id", requestId);
            return api.postJson("/api/auth/login", Map.of("email", email, "password", password), headers);
        } catch (Exception ex) {
            throw new RuntimeException(ex);
        }
    }

    private ApiTestClient.ApiTestResponse doRefresh(Cookie refreshCookie, String requestId) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("X-Request-Id", requestId);
            return api.postJson("/api/auth/refresh", Map.of(), headers, refreshCookie);
        } catch (Exception ex) {
            throw new RuntimeException(ex);
        }
    }

    private ApiTestClient.ApiTestResponse doLogout(Cookie refreshCookie, String requestId) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("X-Request-Id", requestId);
            return api.postJson("/api/auth/logout", Map.of(), headers, refreshCookie);
        } catch (Exception ex) {
            throw new RuntimeException(ex);
        }
    }

    private Cookie requireRefreshCookie(ApiTestClient.ApiTestResponse response) {
        String header = response.headers().getOrEmpty(HttpHeaders.SET_COOKIE).stream()
                .filter(value -> value.startsWith("barmi_refresh_token="))
                .findFirst()
                .orElseThrow(() -> new AssertionError("refresh cookie header missing"));
        String[] parts = header.split(";", 2);
        String[] nameValue = parts[0].split("=", 2);
        return new Cookie(nameValue[0], nameValue.length > 1 ? nameValue[1] : "");
    }

    private long activeTokenCount() {
        return refreshTokenRepository.findAll().stream()
                .filter(token -> token.getRevokedAt() == null)
                .count();
    }

    private String errorCode(ApiTestClient.ApiTestResponse response) {
        return ((Map<String, Object>) response.body().get("error")).get("code").toString();
    }

    static final class RefreshTokenRaceHarness {
        private volatile String blockedRequestId;
        private volatile String blockedMethod;
        private volatile CountDownLatch loadedLatch = new CountDownLatch(1);
        private volatile CountDownLatch releaseLatch = new CountDownLatch(1);

        void reset() {
            blockedRequestId = null;
            blockedMethod = null;
            loadedLatch = new CountDownLatch(1);
            releaseLatch = new CountDownLatch(1);
        }

        void blockAfterFindByTokenHash(String requestId) {
            blockedRequestId = requestId;
            blockedMethod = "findByTokenHash";
            loadedLatch = new CountDownLatch(1);
            releaseLatch = new CountDownLatch(1);
        }

        void blockAfterFindUserByEmail(String requestId) {
            blockedRequestId = requestId;
            blockedMethod = "findByEmail";
            loadedLatch = new CountDownLatch(1);
            releaseLatch = new CountDownLatch(1);
        }

        boolean awaitLoserLoaded() throws InterruptedException {
            return loadedLatch.await(10, TimeUnit.SECONDS);
        }

        void releaseLoser() {
            releaseLatch.countDown();
        }

        Optional<Object> afterFindByTokenHash(Optional<Object> result, String requestId) {
            if (shouldBlock("findByTokenHash", requestId) && result.isPresent()) {
                loadedLatch.countDown();
                try {
                    if (!releaseLatch.await(10, TimeUnit.SECONDS)) {
                        throw new IllegalStateException("timed out waiting for winner to finish");
                    }
                } catch (InterruptedException ex) {
                    Thread.currentThread().interrupt();
                    throw new IllegalStateException("interrupted while waiting for winner", ex);
                }
            }
            return result;
        }

        Optional<Object> afterFindUserByEmail(Optional<Object> result, String requestId) {
            if (shouldBlock("findByEmail", requestId) && result.isPresent()) {
                loadedLatch.countDown();
                try {
                    if (!releaseLatch.await(10, TimeUnit.SECONDS)) {
                        throw new IllegalStateException("timed out waiting for winner to finish");
                    }
                } catch (InterruptedException ex) {
                    Thread.currentThread().interrupt();
                    throw new IllegalStateException("interrupted while waiting for winner", ex);
                }
            }
            return result;
        }

        private boolean shouldBlock(String method, String requestId) {
            return blockedRequestId != null
                    && blockedMethod != null
                    && blockedRequestId.equals(requestId)
                    && blockedMethod.equals(method);
        }
    }

    @TestConfiguration
    static class ConcurrencyHarnessConfig {

        @Bean
        RefreshTokenRaceHarness refreshTokenRaceHarness() {
            return new RefreshTokenRaceHarness();
        }

        @Bean
        @Order(Ordered.HIGHEST_PRECEDENCE)
        static BeanPostProcessor refreshTokenRepositoryHarnessPostProcessor(RefreshTokenRaceHarness raceHarness) {
            return new BeanPostProcessor() {
                @Override
                public Object postProcessAfterInitialization(Object bean, String beanName) throws BeansException {
                    if (!(bean instanceof RefreshTokenRepository repository)) {
                        return bean;
                    }

                    ProxyFactory factory = new ProxyFactory(repository);
                    factory.setProxyTargetClass(false);
                    factory.addAdvice((org.aopalliance.intercept.MethodInterceptor) invocation -> {
                        Object result = invocation.proceed();
                        String requestId = Optional.ofNullable(org.slf4j.MDC.get("requestId")).orElse("none");
                        if ("findByTokenHash".equals(invocation.getMethod().getName()) && result instanceof Optional<?> optional) {
                            return raceHarness.afterFindByTokenHash((Optional<Object>) optional, requestId);
                        }
                        return result;
                    });
                    return factory.getProxy();
                }
            };
        }

        @Bean
        @Order(Ordered.HIGHEST_PRECEDENCE)
        static BeanPostProcessor userRepositoryHarnessPostProcessor(RefreshTokenRaceHarness raceHarness) {
            return new BeanPostProcessor() {
                @Override
                public Object postProcessAfterInitialization(Object bean, String beanName) throws BeansException {
                    if (!(bean instanceof UserRepository repository)) {
                        return bean;
                    }

                    ProxyFactory factory = new ProxyFactory(repository);
                    factory.setProxyTargetClass(false);
                    factory.addAdvice((org.aopalliance.intercept.MethodInterceptor) invocation -> {
                        Object result = invocation.proceed();
                        String requestId = Optional.ofNullable(org.slf4j.MDC.get("requestId")).orElse("none");
                        if ("findByEmail".equals(invocation.getMethod().getName()) && result instanceof Optional<?> optional) {
                            return raceHarness.afterFindUserByEmail((Optional<Object>) optional, requestId);
                        }
                        return result;
                    });
                    return factory.getProxy();
                }
            };
        }
    }
}
