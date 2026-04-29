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
                "logging"
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
                "smtp"
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
                "logging"
        );

        assertThatThrownBy(guard::validate)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("prod_profile_requires_non_default_jwt_secret");
    }
}
