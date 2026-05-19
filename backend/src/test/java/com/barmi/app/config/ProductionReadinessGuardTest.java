package com.barmi.app.config;

import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ProductionReadinessGuardTest {

    @Test
    void skipsStrictValidationOutsideProd() {
        ProductionReadinessGuard guard = new ProductionReadinessGuard(
                new MockEnvironment(),
                true,
                ProductionReadinessGuard.DEFAULT_JWT_SECRET,
                ProductionReadinessGuard.DEFAULT_WEBHOOK_SECRET,
                ProductionReadinessGuard.DEFAULT_BASE_DOMAIN,
                "http",
                "logging",
                ProductionReadinessGuard.DEFAULT_ALLOWED_ORIGINS,
                false
        );

        assertThatCode(guard::validate).doesNotThrowAnyException();
    }

    @Test
    void rejectsDevIdentityHeaderInProd() {
        MockEnvironment environment = new MockEnvironment();
        environment.setActiveProfiles("prod");
        ProductionReadinessGuard guard = new ProductionReadinessGuard(
                environment,
                true,
                "real-jwt-secret-32-bytes-minimum-value",
                "real-webhook-secret",
                "barmi.example.org",
                "https",
                "smtp",
                "https://app.barmi.example",
                true
        );

        assertThatThrownBy(guard::validate)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("prod_profile_forbids_allow_dev_identity_header");
    }

    @Test
    void rejectsDefaultSecretsAndPlaceholderDomainInProd() {
        MockEnvironment environment = new MockEnvironment();
        environment.setActiveProfiles("prod");
        ProductionReadinessGuard guard = new ProductionReadinessGuard(
                environment,
                false,
                ProductionReadinessGuard.DEFAULT_JWT_SECRET,
                ProductionReadinessGuard.DEFAULT_WEBHOOK_SECRET,
                ProductionReadinessGuard.DEFAULT_BASE_DOMAIN,
                "https",
                "logging",
                ProductionReadinessGuard.DEFAULT_ALLOWED_ORIGINS,
                true
        );

        assertThatThrownBy(guard::validate)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("prod_profile_requires_non_default_jwt_secret");
    }

    @Test
    void allowsExplicitLocalOriginsInStaging() {
        MockEnvironment environment = new MockEnvironment();
        environment.setActiveProfiles("staging");
        ProductionReadinessGuard guard = new ProductionReadinessGuard(
                environment,
                false,
                "real-jwt-secret-32-bytes-minimum-value",
                "real-webhook-secret",
                "staging.barmi.local",
                "http",
                "logging",
                "http://localhost:8088,http://staging.barmi.local:8088",
                false
        );

        assertThatCode(guard::validate).doesNotThrowAnyException();
    }

    @Test
    void rejectsDevFrontendDefaultsInStaging() {
        MockEnvironment environment = new MockEnvironment();
        environment.setActiveProfiles("staging");
        ProductionReadinessGuard guard = new ProductionReadinessGuard(
                environment,
                false,
                "real-jwt-secret-32-bytes-minimum-value",
                "real-webhook-secret",
                "staging.barmi.local",
                "http",
                "logging",
                ProductionReadinessGuard.DEFAULT_ALLOWED_ORIGINS,
                false
        );

        assertThatThrownBy(guard::validate)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("staging_profile_requires_explicit_allowed_origins");
    }

    @Test
    void rejectsLocalOriginsInProd() {
        MockEnvironment environment = new MockEnvironment();
        environment.setActiveProfiles("prod");
        ProductionReadinessGuard guard = new ProductionReadinessGuard(
                environment,
                false,
                "real-jwt-secret-32-bytes-minimum-value",
                "real-webhook-secret",
                "barmi.example.org",
                "https",
                "smtp",
                "https://app.barmi.example,http://localhost:8088",
                true
        );

        assertThatThrownBy(guard::validate)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("prod_profile_forbids_local_allowed_origins");
    }
}
