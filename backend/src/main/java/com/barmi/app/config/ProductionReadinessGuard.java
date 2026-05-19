package com.barmi.app.config;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.Locale;

@Component
public class ProductionReadinessGuard {
    static final String DEFAULT_JWT_SECRET = "JWT_SIGNING_KEY=7f9c2ba4e88f827d616045507605853ed73b8094b9b2e0c3c5c7e5c7c4e1c9a1";
    static final String DEFAULT_WEBHOOK_SECRET = "change-me";
    static final String DEFAULT_BASE_DOMAIN = "example.com";
    static final String DEFAULT_ALLOWED_ORIGINS = "http://localhost:5173,http://127.0.0.1:5173";

    private static final Logger log = LoggerFactory.getLogger(ProductionReadinessGuard.class);

    private final Environment environment;
    private final boolean allowDevIdentityHeader;
    private final String jwtSecret;
    private final String webhookSecret;
    private final String baseDomain;
    private final String publicScheme;
    private final String notificationEmailMode;
    private final String allowedOrigins;
    private final boolean refreshCookieSecure;

    public ProductionReadinessGuard(
            Environment environment,
            @Value("${app.security.allowDevIdentityHeader:false}") boolean allowDevIdentityHeader,
            @Value("${app.security.jwtSecret:}") String jwtSecret,
            @Value("${app.mercadoPago.webhookSecret:}") String webhookSecret,
            @Value("${app.tenant.baseDomain:}") String baseDomain,
            @Value("${app.notifications.storePublicScheme:https}") String publicScheme,
            @Value("${app.notifications.email.mode:logging}") String notificationEmailMode,
            @Value("${app.security.allowedOrigins:}") String allowedOrigins,
            @Value("${app.security.refreshCookie.secure:false}") boolean refreshCookieSecure
    ) {
        this.environment = environment;
        this.allowDevIdentityHeader = allowDevIdentityHeader;
        this.jwtSecret = jwtSecret;
        this.webhookSecret = webhookSecret;
        this.baseDomain = baseDomain;
        this.publicScheme = publicScheme;
        this.notificationEmailMode = notificationEmailMode;
        this.allowedOrigins = allowedOrigins;
        this.refreshCookieSecure = refreshCookieSecure;
    }

    @PostConstruct
    void validate() {
        if (isStagingProfile()) {
            validateStaging();
            return;
        }
        if (isProdProfile()) {
            validateProd();
        }
    }

    private boolean isProdProfile() {
        return Arrays.asList(environment.getActiveProfiles()).contains("prod");
    }

    private boolean isStagingProfile() {
        return Arrays.asList(environment.getActiveProfiles()).contains("staging");
    }

    private void validateStaging() {
        validateSharedNonLocalSecurity("staging_profile");

        if (DEFAULT_ALLOWED_ORIGINS.equalsIgnoreCase(trimmed(allowedOrigins))) {
            throw new IllegalStateException("staging_profile_requires_explicit_allowed_origins");
        }
        if (!containsAllowedStagingOrigin(allowedOrigins)) {
            throw new IllegalStateException("staging_profile_requires_localhost_or_local_domain_allowed_origins");
        }
        if (!"http".equalsIgnoreCase(publicScheme) && !"https".equalsIgnoreCase(publicScheme)) {
            throw new IllegalStateException("staging_profile_requires_http_or_https_store_public_scheme");
        }
        if (!refreshCookieSecure) {
            log.warn("staging_readiness_refresh_cookie_secure_disabled_for_http_staging");
        }
        if ("logging".equalsIgnoreCase(notificationEmailMode)) {
            log.warn("staging_readiness_notifications_still_logging_mode");
        }
    }

    private void validateProd() {
        validateSharedNonLocalSecurity("prod_profile");

        if (allowedOrigins == null || allowedOrigins.isBlank() || DEFAULT_ALLOWED_ORIGINS.equalsIgnoreCase(trimmed(allowedOrigins))) {
            throw new IllegalStateException("prod_profile_requires_real_allowed_origins");
        }
        if (containsLocalhostOrigin(allowedOrigins) || containsDotLocalOrigin(allowedOrigins)) {
            throw new IllegalStateException("prod_profile_forbids_local_allowed_origins");
        }
        if (!refreshCookieSecure) {
            throw new IllegalStateException("prod_profile_requires_secure_refresh_cookie");
        }
        if (!"https".equalsIgnoreCase(publicScheme)) {
            log.warn("prod_readiness_non_https_store_public_scheme scheme={}", publicScheme);
        }
        if ("logging".equalsIgnoreCase(notificationEmailMode)) {
            log.warn("prod_readiness_notifications_still_logging_mode");
        }
    }

    private void validateSharedNonLocalSecurity(String profilePrefix) {
        if (allowDevIdentityHeader) {
            throw new IllegalStateException(profilePrefix + "_forbids_allow_dev_identity_header");
        }
        if (jwtSecret == null || jwtSecret.isBlank() || DEFAULT_JWT_SECRET.equals(jwtSecret)) {
            throw new IllegalStateException(profilePrefix + "_requires_non_default_jwt_secret");
        }
        if (webhookSecret == null || webhookSecret.isBlank() || DEFAULT_WEBHOOK_SECRET.equals(webhookSecret)) {
            throw new IllegalStateException(profilePrefix + "_requires_non_default_mp_webhook_secret");
        }
        if (baseDomain == null || baseDomain.isBlank() || DEFAULT_BASE_DOMAIN.equalsIgnoreCase(baseDomain.trim())) {
            throw new IllegalStateException(profilePrefix + "_requires_real_store_base_domain");
        }
        if (allowedOrigins == null || allowedOrigins.isBlank()) {
            throw new IllegalStateException(profilePrefix + "_requires_allowed_origins");
        }
    }

    private boolean containsAllowedStagingOrigin(String origins) {
        return containsLocalhostOrigin(origins) || containsDotLocalOrigin(origins);
    }

    private boolean containsLocalhostOrigin(String origins) {
        return containsFragment(origins, "localhost") || containsFragment(origins, "127.0.0.1");
    }

    private boolean containsDotLocalOrigin(String origins) {
        return containsFragment(origins, ".local");
    }

    private boolean containsFragment(String origins, String fragment) {
        if (origins == null || origins.isBlank()) {
            return false;
        }
        String normalizedFragment = fragment.toLowerCase(Locale.ROOT);
        return Arrays.stream(origins.split(","))
                .map(String::trim)
                .filter(value -> !value.isBlank())
                .map(value -> value.toLowerCase(Locale.ROOT))
                .anyMatch(value -> value.contains(normalizedFragment));
    }

    private String trimmed(String value) {
        return value == null ? "" : value.trim();
    }
}
