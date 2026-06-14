package com.barmi.app.tenant;

import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;

class StoreResolverFilterTest {

    @AfterEach
    void clearTenantContext() {
        TenantContext.clear();
    }

    @Test
    void ignoresForwardedHostWhenProxyHeadersAreNotTrusted() throws Exception {
        StoreResolverFilter filter = new StoreResolverFilter("example.com", false);
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Host", "real.example.com");
        request.addHeader("X-Forwarded-Host", "spoof.example.com");

        AtomicReference<String> resolvedSlug = doFilterAndCaptureSlug(filter, request);

        assertThat(resolvedSlug).hasValue("real");
        assertThat(TenantContext.getStoreSlug()).isNull();
    }

    @Test
    void usesForwardedHostWhenProxyHeadersAreTrusted() throws Exception {
        StoreResolverFilter filter = new StoreResolverFilter("example.com", true);
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Host", "real.example.com");
        request.addHeader("X-Forwarded-Host", "forwarded.example.com");

        AtomicReference<String> resolvedSlug = doFilterAndCaptureSlug(filter, request);

        assertThat(resolvedSlug).hasValue("forwarded");
        assertThat(TenantContext.getStoreSlug()).isNull();
    }

    @Test
    void malformedForwardedHostDoesNotFallbackToHostWhenProxyHeadersAreTrusted() throws Exception {
        StoreResolverFilter filter = new StoreResolverFilter("example.com", true);
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Host", "real.example.com");
        request.addHeader("X-Forwarded-Host", "spoof.example.com,real.example.com");

        AtomicReference<String> resolvedSlug = doFilterAndCaptureSlug(filter, request);

        assertThat(resolvedSlug.get()).isNull();
        assertThat(TenantContext.getStoreSlug()).isNull();
    }

    @Test
    void normalizesHostWithPort() throws Exception {
        StoreResolverFilter filter = new StoreResolverFilter("example.com", false);
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Host", "Store-A.example.com:8080");

        AtomicReference<String> resolvedSlug = doFilterAndCaptureSlug(filter, request);

        assertThat(resolvedSlug).hasValue("store-a");
        assertThat(TenantContext.getStoreSlug()).isNull();
    }

    @Test
    void malformedHostDoesNotResolveTenant() throws Exception {
        StoreResolverFilter filter = new StoreResolverFilter("example.com", false);
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Host", "store.example.com/path");

        AtomicReference<String> resolvedSlug = doFilterAndCaptureSlug(filter, request);

        assertThat(resolvedSlug.get()).isNull();
        assertThat(TenantContext.getStoreSlug()).isNull();
    }

    @Test
    void malformedEmptySlugHostDoesNotResolveTenant() throws Exception {
        StoreResolverFilter filter = new StoreResolverFilter("example.com", false);
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Host", ".example.com");

        AtomicReference<String> resolvedSlug = doFilterAndCaptureSlug(filter, request);

        assertThat(resolvedSlug.get()).isNull();
        assertThat(TenantContext.getStoreSlug()).isNull();
    }

    private AtomicReference<String> doFilterAndCaptureSlug(StoreResolverFilter filter, MockHttpServletRequest request)
            throws Exception {
        AtomicReference<String> resolvedSlug = new AtomicReference<>();
        FilterChain chain = (servletRequest, servletResponse) -> resolvedSlug.set(TenantContext.getStoreSlug());

        filter.doFilter(request, new MockHttpServletResponse(), chain);

        return resolvedSlug;
    }
}
