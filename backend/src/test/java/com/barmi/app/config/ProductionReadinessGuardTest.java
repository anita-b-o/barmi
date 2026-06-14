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
                false,
                "none",
                "http",
                "logging",
                ProductionReadinessGuard.DEFAULT_ALLOWED_ORIGINS,
                false,
                "256KB",
                "256KB",
                "16KB",
                "256KB",
                262144
        );

        assertThatCode(guard::validate).doesNotThrowAnyException();
    }

    @Test
    void preservesLocalhostOriginsOutsideProd() {
        MockEnvironment environment = new MockEnvironment();
        environment.setActiveProfiles("local");
        ProductionReadinessGuard guard = new ProductionReadinessGuard(
                environment,
                true,
                ProductionReadinessGuard.DEFAULT_JWT_SECRET,
                ProductionReadinessGuard.DEFAULT_WEBHOOK_SECRET,
                ProductionReadinessGuard.DEFAULT_BASE_DOMAIN,
                true,
                "none",
                "http",
                "logging",
                ProductionReadinessGuard.DEFAULT_ALLOWED_ORIGINS,
                false,
                "256KB",
                "256KB",
                "16KB",
                "256KB",
                262144
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
                false,
                "none",
                "https",
                "smtp",
                "https://app.barmi.example",
                true,
                "256KB",
                "256KB",
                "16KB",
                "256KB",
                262144
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
                false,
                "none",
                "https",
                "logging",
                ProductionReadinessGuard.DEFAULT_ALLOWED_ORIGINS,
                true,
                "256KB",
                "256KB",
                "16KB",
                "256KB",
                262144
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
                true,
                "none",
                "http",
                "logging",
                "http://localhost:8088,http://staging.barmi.local:8088",
                false,
                "256KB",
                "256KB",
                "16KB",
                "256KB",
                262144
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
                true,
                "none",
                "http",
                "logging",
                ProductionReadinessGuard.DEFAULT_ALLOWED_ORIGINS,
                false,
                "256KB",
                "256KB",
                "16KB",
                "256KB",
                262144
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
                false,
                "none",
                "https",
                "smtp",
                "https://app.barmi.example,http://localhost:8088",
                true,
                "256KB",
                "256KB",
                "16KB",
                "256KB",
                262144
        );

        assertThatThrownBy(guard::validate)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("prod_profile_forbids_local_allowed_origins");
    }

    @Test
    void rejectsWildcardAllowedOriginsInProd() {
        MockEnvironment environment = new MockEnvironment();
        environment.setActiveProfiles("prod");
        ProductionReadinessGuard guard = new ProductionReadinessGuard(
                environment,
                false,
                "real-jwt-secret-32-bytes-minimum-value",
                "real-webhook-secret",
                "barmi.example.org",
                false,
                "none",
                "https",
                "smtp",
                "https://app.barmi.example,*",
                true,
                "256KB",
                "256KB",
                "16KB",
                "256KB",
                262144
        );

        assertThatThrownBy(guard::validate)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("prod_profile_forbids_wildcard_allowed_origins");
    }

    @Test
    void rejectsHttpAllowedOriginsInProd() {
        MockEnvironment environment = new MockEnvironment();
        environment.setActiveProfiles("prod");
        ProductionReadinessGuard guard = new ProductionReadinessGuard(
                environment,
                false,
                "real-jwt-secret-32-bytes-minimum-value",
                "real-webhook-secret",
                "barmi.example.org",
                false,
                "none",
                "https",
                "smtp",
                "http://app.barmi.example",
                true,
                "256KB",
                "256KB",
                "16KB",
                "256KB",
                262144
        );

        assertThatThrownBy(guard::validate)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("prod_profile_requires_https_allowed_origins");
    }

    @Test
    void acceptsExplicitHttpsAllowedOriginsInProd() {
        MockEnvironment environment = new MockEnvironment();
        environment.setActiveProfiles("prod");
        withSmtpConfig(environment);
        ProductionReadinessGuard guard = new ProductionReadinessGuard(
                environment,
                false,
                "real-jwt-secret-32-bytes-minimum-value",
                "real-webhook-secret",
                "barmi.example.org",
                false,
                "none",
                "https",
                "smtp",
                "https://app.barmi.example,https://admin.barmi.example",
                true,
                "256KB",
                "256KB",
                "16KB",
                "256KB",
                262144
        );

        assertThatCode(guard::validate).doesNotThrowAnyException();
    }

    @Test
    void rejectsInvalidNotificationEmailModeInProd() {
        MockEnvironment environment = new MockEnvironment();
        environment.setActiveProfiles("prod");
        ProductionReadinessGuard guard = new ProductionReadinessGuard(
                environment,
                false,
                "real-jwt-secret-32-bytes-minimum-value",
                "real-webhook-secret",
                "barmi.example.org",
                false,
                "none",
                "https",
                "smpt",
                "https://app.barmi.example",
                true,
                "256KB",
                "256KB",
                "16KB",
                "256KB",
                262144
        );

        assertThatThrownBy(guard::validate)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("prod_profile_requires_valid_notification_email_mode");
    }

    @Test
    void rejectsSmtpModeWithoutMailHostInProd() {
        MockEnvironment environment = new MockEnvironment();
        environment.setActiveProfiles("prod");
        environment.setProperty("app.notifications.email.from", "no-reply@barmi.example");
        environment.setProperty("spring.mail.port", "587");
        environment.setProperty("spring.mail.username", "smtp-user");
        environment.setProperty("spring.mail.password", "smtp-password");
        ProductionReadinessGuard guard = new ProductionReadinessGuard(
                environment,
                false,
                "real-jwt-secret-32-bytes-minimum-value",
                "real-webhook-secret",
                "barmi.example.org",
                false,
                "none",
                "https",
                "smtp",
                "https://app.barmi.example",
                true,
                "256KB",
                "256KB",
                "16KB",
                "256KB",
                262144
        );

        assertThatThrownBy(guard::validate)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("prod_profile_requires_spring_mail_host");
    }

    @Test
    void rejectsUnlimitedHttpBodyLimitsInProd() {
        MockEnvironment environment = new MockEnvironment();
        environment.setActiveProfiles("prod");
        ProductionReadinessGuard guard = new ProductionReadinessGuard(
                environment,
                false,
                "real-jwt-secret-32-bytes-minimum-value",
                "real-webhook-secret",
                "barmi.example.org",
                false,
                "none",
                "https",
                "smtp",
                "https://app.barmi.example",
                true,
                "256KB",
                "-1",
                "16KB",
                "256KB",
                262144
        );

        assertThatThrownBy(guard::validate)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("prod_profile_requires_bounded_http_swallow_size");
    }

    @Test
    void rejectsTooLargeHttpBodyLimitsInProd() {
        MockEnvironment environment = new MockEnvironment();
        environment.setActiveProfiles("prod");
        ProductionReadinessGuard guard = new ProductionReadinessGuard(
                environment,
                false,
                "real-jwt-secret-32-bytes-minimum-value",
                "real-webhook-secret",
                "barmi.example.org",
                false,
                "none",
                "https",
                "smtp",
                "https://app.barmi.example",
                true,
                "10MB",
                "256KB",
                "16KB",
                "256KB",
                262144
        );

        assertThatThrownBy(guard::validate)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("prod_profile_requires_bounded_http_form_post_size");
    }

    @Test
    void preservesLocalErgonomicsForLargerHttpLimits() {
        MockEnvironment environment = new MockEnvironment();
        environment.setActiveProfiles("local");
        ProductionReadinessGuard guard = new ProductionReadinessGuard(
                environment,
                true,
                ProductionReadinessGuard.DEFAULT_JWT_SECRET,
                ProductionReadinessGuard.DEFAULT_WEBHOOK_SECRET,
                ProductionReadinessGuard.DEFAULT_BASE_DOMAIN,
                true,
                "none",
                "http",
                "logging",
                ProductionReadinessGuard.DEFAULT_ALLOWED_ORIGINS,
                false,
                "10MB",
                "10MB",
                "128KB",
                "10MB",
                10 * 1024 * 1024
        );

        assertThatCode(guard::validate).doesNotThrowAnyException();
    }

    @Test
    void rejectsFrameworkForwardHeadersInProdWhenProxyHeadersAreNotTrusted() {
        MockEnvironment environment = new MockEnvironment();
        environment.setActiveProfiles("prod");
        ProductionReadinessGuard guard = new ProductionReadinessGuard(
                environment,
                false,
                "real-jwt-secret-32-bytes-minimum-value",
                "real-webhook-secret",
                "barmi.example.org",
                false,
                "framework",
                "https",
                "smtp",
                "https://app.barmi.example",
                true,
                "256KB",
                "256KB",
                "16KB",
                "256KB",
                262144
        );

        assertThatThrownBy(guard::validate)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("prod_profile_forbids_forward_headers_without_trust_proxy");
    }

    private void withSmtpConfig(MockEnvironment environment) {
        environment.setProperty("app.notifications.email.from", "no-reply@barmi.example");
        environment.setProperty("spring.mail.host", "smtp.barmi.example");
        environment.setProperty("spring.mail.port", "587");
        environment.setProperty("spring.mail.username", "smtp-user");
        environment.setProperty("spring.mail.password", "smtp-password");
    }
}
