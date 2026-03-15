package com.barmi.app.tenant;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Resolves store slug from Host header:
 * - ecosystem: example.com -> no store
 * - store: {slug}.example.com -> store slug
 */
@Component
public class StoreResolverFilter extends OncePerRequestFilter {

    private final String baseDomain;

    public StoreResolverFilter(@Value("${app.tenant.baseDomain}") String baseDomain) {
        this.baseDomain = baseDomain;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String host = request.getHeader("X-Forwarded-Host");
        if (host == null || host.isBlank()) {
            host = request.getHeader("Host");
        }
        try {
            if (host != null) {
                // strip port
                host = host.split(":")[0].toLowerCase();
                if (host.endsWith("." + baseDomain) && !host.equals(baseDomain)) {
                    String slug = host.substring(0, host.length() - ("." + baseDomain).length());
                    TenantContext.setStoreSlug(slug);
                } else {
                    TenantContext.setStoreSlug(null);
                }
            }
            filterChain.doFilter(request, response);
        } finally {
            TenantContext.clear();
        }
    }
}
