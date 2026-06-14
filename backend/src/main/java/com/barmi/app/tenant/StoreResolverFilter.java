package com.barmi.app.tenant;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Locale;
import java.util.regex.Pattern;

/**
 * Resolves store slug from Host header:
 * - ecosystem: example.com -> no store
 * - store: {slug}.example.com -> store slug
 */
@Component
public class StoreResolverFilter extends OncePerRequestFilter {

    private static final Pattern HOST_PATTERN = Pattern.compile("[a-z0-9.-]+");

    private final String baseDomain;
    private final boolean trustProxyHeaders;

    public StoreResolverFilter(
            @Value("${app.tenant.baseDomain}") String baseDomain,
            @Value("${app.tenant.trustProxyHeaders:false}") boolean trustProxyHeaders
    ) {
        this.baseDomain = normalizeConfiguredHost(baseDomain);
        this.trustProxyHeaders = trustProxyHeaders;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String host = resolveHost(request);
        try {
            if (host != null) {
                if (host.endsWith("." + baseDomain) && !host.equals(baseDomain)) {
                    String slug = host.substring(0, host.length() - ("." + baseDomain).length());
                    TenantContext.setStoreSlug(slug.isBlank() ? null : slug);
                } else {
                    TenantContext.setStoreSlug(null);
                }
            }
            filterChain.doFilter(request, response);
        } finally {
            TenantContext.clear();
        }
    }

    private String resolveHost(HttpServletRequest request) {
        String forwardedHost = request.getHeader("X-Forwarded-Host");
        if (trustProxyHeaders && forwardedHost != null && !forwardedHost.isBlank()) {
            return normalizeRequestHost(forwardedHost);
        }
        return normalizeRequestHost(request.getHeader("Host"));
    }

    private String normalizeRequestHost(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String host = value.trim().toLowerCase(Locale.ROOT);
        if (host.contains(",") || host.contains("/") || host.contains("?") || host.contains("#")) {
            return null;
        }
        int portSeparator = host.lastIndexOf(':');
        if (portSeparator >= 0) {
            host = host.substring(0, portSeparator);
        }
        if (host.isBlank() || !isValidHost(host)) {
            return null;
        }
        return host;
    }

    private boolean isValidHost(String host) {
        if (!HOST_PATTERN.matcher(host).matches() || host.startsWith(".") || host.endsWith(".") || host.contains("..")) {
            return false;
        }
        for (String label : host.split("\\.")) {
            if (label.isBlank() || label.startsWith("-") || label.endsWith("-")) {
                return false;
            }
        }
        return true;
    }

    private String normalizeConfiguredHost(String value) {
        if (value == null) {
            return "";
        }
        return value.trim().toLowerCase(Locale.ROOT);
    }
}
