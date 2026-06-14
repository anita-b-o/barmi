package com.barmi.app.config;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;
import org.springframework.util.unit.DataSize;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.Arrays;
import java.util.List;
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
    private final boolean trustProxyHeaders;
    private final String forwardHeadersStrategy;
    private final String publicScheme;
    private final String notificationEmailMode;
    private final String allowedOrigins;
    private final boolean refreshCookieSecure;
    private final String maxHttpFormPostSize;
    private final String maxSwallowSize;
    private final String maxRequestHeaderSize;
    private final String multipartMaxRequestSize;
    private final int rateLimitMaxCachedBodyBytes;

    public ProductionReadinessGuard(
            Environment environment,
            @Value("${app.security.allowDevIdentityHeader:false}") boolean allowDevIdentityHeader,
            @Value("${app.security.jwtSecret:}") String jwtSecret,
            @Value("${app.mercadoPago.webhookSecret:}") String webhookSecret,
            @Value("${app.tenant.baseDomain:}") String baseDomain,
            @Value("${app.tenant.trustProxyHeaders:false}") boolean trustProxyHeaders,
            @Value("${server.forward-headers-strategy:none}") String forwardHeadersStrategy,
            @Value("${app.notifications.storePublicScheme:https}") String publicScheme,
            @Value("${app.notifications.email.mode:logging}") String notificationEmailMode,
            @Value("${app.security.allowedOrigins:}") String allowedOrigins,
            @Value("${app.security.refreshCookie.secure:false}") boolean refreshCookieSecure,
            @Value("${server.tomcat.max-http-form-post-size:256KB}") String maxHttpFormPostSize,
            @Value("${server.tomcat.max-swallow-size:256KB}") String maxSwallowSize,
            @Value("${server.max-http-request-header-size:16KB}") String maxRequestHeaderSize,
            @Value("${spring.servlet.multipart.max-request-size:256KB}") String multipartMaxRequestSize,
            @Value("${app.rateLimit.maxCachedBodyBytes:262144}") int rateLimitMaxCachedBodyBytes
    ) {
        this.environment = environment;
        this.allowDevIdentityHeader = allowDevIdentityHeader;
        this.jwtSecret = jwtSecret;
        this.webhookSecret = webhookSecret;
        this.baseDomain = baseDomain;
        this.trustProxyHeaders = trustProxyHeaders;
        this.forwardHeadersStrategy = forwardHeadersStrategy;
        this.publicScheme = publicScheme;
        this.notificationEmailMode = notificationEmailMode;
        this.allowedOrigins = allowedOrigins;
        this.refreshCookieSecure = refreshCookieSecure;
        this.maxHttpFormPostSize = maxHttpFormPostSize;
        this.maxSwallowSize = maxSwallowSize;
        this.maxRequestHeaderSize = maxRequestHeaderSize;
        this.multipartMaxRequestSize = multipartMaxRequestSize;
        this.rateLimitMaxCachedBodyBytes = rateLimitMaxCachedBodyBytes;
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
        validateNotificationEmailConfig("staging_profile");
        if ("logging".equalsIgnoreCase(trimmed(notificationEmailMode))) {
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
        validateProdAllowedOrigins();
        if (usesFrameworkForwardHeaders() && !trustProxyHeaders) {
            throw new IllegalStateException("prod_profile_forbids_forward_headers_without_trust_proxy");
        }
        validateProdHttpLimits();
        if (!refreshCookieSecure) {
            throw new IllegalStateException("prod_profile_requires_secure_refresh_cookie");
        }
        if (!"https".equalsIgnoreCase(publicScheme)) {
            log.warn("prod_readiness_non_https_store_public_scheme scheme={}", publicScheme);
        }
        validateNotificationEmailConfig("prod_profile");
        if ("logging".equalsIgnoreCase(trimmed(notificationEmailMode))) {
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

    private void validateProdAllowedOrigins() {
        List<String> origins = parseOrigins(allowedOrigins);
        if (origins.isEmpty()) {
            throw new IllegalStateException("prod_profile_requires_real_allowed_origins");
        }

        for (String origin : origins) {
            if (origin.contains("*")) {
                throw new IllegalStateException("prod_profile_forbids_wildcard_allowed_origins");
            }
            URI uri = parseOriginUri(origin);
            if (!"https".equalsIgnoreCase(uri.getScheme())) {
                throw new IllegalStateException("prod_profile_requires_https_allowed_origins");
            }
            if (uri.getHost() == null || uri.getHost().isBlank()) {
                throw new IllegalStateException("prod_profile_requires_valid_allowed_origins");
            }
            if (uri.getUserInfo() != null || uri.getQuery() != null || uri.getFragment() != null || hasNonRootPath(uri)) {
                throw new IllegalStateException("prod_profile_requires_origin_only_allowed_origins");
            }
        }
    }

    private URI parseOriginUri(String origin) {
        try {
            return new URI(origin);
        } catch (URISyntaxException exception) {
            throw new IllegalStateException("prod_profile_requires_valid_allowed_origins", exception);
        }
    }

    private boolean hasNonRootPath(URI uri) {
        return uri.getPath() != null && !uri.getPath().isBlank() && !"/".equals(uri.getPath());
    }

    private boolean usesFrameworkForwardHeaders() {
        return "framework".equalsIgnoreCase(trimmed(forwardHeadersStrategy));
    }

    private void validateNotificationEmailConfig(String profilePrefix) {
        String mode = trimmed(notificationEmailMode).toLowerCase(Locale.ROOT);
        if (!"logging".equals(mode) && !"smtp".equals(mode)) {
            throw new IllegalStateException(profilePrefix + "_requires_valid_notification_email_mode");
        }
        if (!"smtp".equals(mode)) {
            return;
        }

        requirePresent("app.notifications.email.from", profilePrefix + "_requires_notification_email_from");
        requirePresent("spring.mail.host", profilePrefix + "_requires_spring_mail_host");
        requirePresent("spring.mail.username", profilePrefix + "_requires_spring_mail_username");
        requirePresent("spring.mail.password", profilePrefix + "_requires_spring_mail_password");

        String port = requirePresent("spring.mail.port", profilePrefix + "_requires_spring_mail_port");
        try {
            if (Integer.parseInt(port) <= 0) {
                throw new IllegalStateException(profilePrefix + "_requires_valid_spring_mail_port");
            }
        } catch (NumberFormatException ex) {
            throw new IllegalStateException(profilePrefix + "_requires_valid_spring_mail_port", ex);
        }
    }

    private String requirePresent(String propertyName, String message) {
        String value = environment.getProperty(propertyName);
        if (value == null || value.isBlank()) {
            throw new IllegalStateException(message);
        }
        return value.trim();
    }

    private void validateProdHttpLimits() {
        long maxBodyBytes = DataSize.ofMegabytes(1).toBytes();
        long maxHeaderBytes = DataSize.ofKilobytes(64).toBytes();

        validatePositiveBoundedDataSize(maxHttpFormPostSize, maxBodyBytes, "prod_profile_requires_bounded_http_form_post_size");
        validatePositiveBoundedDataSize(maxSwallowSize, maxBodyBytes, "prod_profile_requires_bounded_http_swallow_size");
        validatePositiveBoundedDataSize(multipartMaxRequestSize, maxBodyBytes, "prod_profile_requires_bounded_multipart_request_size");
        validatePositiveBoundedDataSize(maxRequestHeaderSize, maxHeaderBytes, "prod_profile_requires_bounded_request_header_size");

        if (rateLimitMaxCachedBodyBytes <= 0 || rateLimitMaxCachedBodyBytes > maxBodyBytes) {
            throw new IllegalStateException("prod_profile_requires_bounded_rate_limit_cached_body_size");
        }
    }

    private void validatePositiveBoundedDataSize(String value, long maxBytes, String message) {
        String trimmedValue = trimmed(value);
        if (trimmedValue.isBlank() || trimmedValue.startsWith("-")) {
            throw new IllegalStateException(message);
        }
        try {
            long bytes = DataSize.parse(trimmedValue).toBytes();
            if (bytes <= 0 || bytes > maxBytes) {
                throw new IllegalStateException(message);
            }
        } catch (IllegalArgumentException exception) {
            throw new IllegalStateException(message, exception);
        }
    }

    private boolean containsLocalhostOrigin(String origins) {
        return containsFragment(origins, "localhost") || containsFragment(origins, "127.0.0.1");
    }

    private boolean containsDotLocalOrigin(String origins) {
        return containsFragment(origins, ".local");
    }

    private boolean containsFragment(String origins, String fragment) {
        String normalizedFragment = fragment.toLowerCase(Locale.ROOT);
        return parseOrigins(origins).stream()
                .map(value -> value.toLowerCase(Locale.ROOT))
                .anyMatch(value -> value.contains(normalizedFragment));
    }

    private List<String> parseOrigins(String origins) {
        if (origins == null || origins.isBlank()) {
            return List.of();
        }
        return Arrays.stream(origins.split(","))
                .map(String::trim)
                .filter(value -> !value.isBlank())
                .toList();
    }

    private String trimmed(String value) {
        return value == null ? "" : value.trim();
    }
}
