package com.barmi.app.config;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import java.util.Arrays;

@Component
public class ProductionReadinessGuard {
    static final String DEFAULT_JWT_SECRET = "JWT_SIGNING_KEY=7f9c2ba4e88f827d616045507605853ed73b8094b9b2e0c3c5c7e5c7c4e1c9a1";
    static final String DEFAULT_WEBHOOK_SECRET = "change-me";
    static final String DEFAULT_BASE_DOMAIN = "example.com";

    private static final Logger log = LoggerFactory.getLogger(ProductionReadinessGuard.class);

    private final Environment environment;
    private final boolean allowDevIdentityHeader;
    private final String jwtSecret;
    private final String webhookSecret;
    private final String baseDomain;
    private final String publicScheme;
    private final String notificationEmailMode;

    public ProductionReadinessGuard(
            Environment environment,
            @Value("${app.security.allowDevIdentityHeader:false}") boolean allowDevIdentityHeader,
            @Value("${app.security.jwtSecret:}") String jwtSecret,
            @Value("${app.mercadoPago.webhookSecret:}") String webhookSecret,
            @Value("${app.tenant.baseDomain:}") String baseDomain,
            @Value("${app.notifications.storePublicScheme:https}") String publicScheme,
            @Value("${app.notifications.email.mode:logging}") String notificationEmailMode
    ) {
        this.environment = environment;
        this.allowDevIdentityHeader = allowDevIdentityHeader;
        this.jwtSecret = jwtSecret;
        this.webhookSecret = webhookSecret;
        this.baseDomain = baseDomain;
        this.publicScheme = publicScheme;
        this.notificationEmailMode = notificationEmailMode;
    }

    @PostConstruct
    void validate() {
        if (!isProdProfile()) {
            return;
        }

        if (allowDevIdentityHeader) {
            throw new IllegalStateException("prod_profile_forbids_allow_dev_identity_header");
        }
        if (jwtSecret == null || jwtSecret.isBlank() || DEFAULT_JWT_SECRET.equals(jwtSecret)) {
            throw new IllegalStateException("prod_profile_requires_non_default_jwt_secret");
        }
        if (webhookSecret == null || webhookSecret.isBlank() || DEFAULT_WEBHOOK_SECRET.equals(webhookSecret)) {
            throw new IllegalStateException("prod_profile_requires_non_default_mp_webhook_secret");
        }
        if (baseDomain == null || baseDomain.isBlank() || DEFAULT_BASE_DOMAIN.equalsIgnoreCase(baseDomain.trim())) {
            throw new IllegalStateException("prod_profile_requires_real_store_base_domain");
        }
        if (!"https".equalsIgnoreCase(publicScheme)) {
            log.warn("prod_readiness_non_https_store_public_scheme scheme={}", publicScheme);
        }
        if ("logging".equalsIgnoreCase(notificationEmailMode)) {
            log.warn("prod_readiness_notifications_still_logging_mode");
        }
    }

    private boolean isProdProfile() {
        return Arrays.asList(environment.getActiveProfiles()).contains("prod");
    }
}
