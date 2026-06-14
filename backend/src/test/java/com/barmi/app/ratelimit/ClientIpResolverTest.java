package com.barmi.app.ratelimit;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

import static org.assertj.core.api.Assertions.assertThat;

class ClientIpResolverTest {

    @Test
    void ignoresProxyHeadersWhenTrustProxyHeadersIsOff() {
        ClientIpResolver resolver = new ClientIpResolver(false);
        MockHttpServletRequest request = requestWithRemoteAddr("198.51.100.10");
        request.addHeader("X-Forwarded-For", "203.0.113.10");
        request.addHeader("X-Real-IP", "203.0.113.11");
        request.addHeader("Forwarded", "for=203.0.113.12");

        assertThat(resolver.resolve(request)).isEqualTo("198.51.100.10");
    }

    @Test
    void usesFirstForwardedForIpWhenTrustProxyHeadersIsOn() {
        ClientIpResolver resolver = new ClientIpResolver(true);
        MockHttpServletRequest request = requestWithRemoteAddr("198.51.100.10");
        request.addHeader("X-Forwarded-For", "203.0.113.10, 198.51.100.20");

        assertThat(resolver.resolve(request)).isEqualTo("203.0.113.10");
    }

    @Test
    void invalidForwardedForFallsBackToRemoteAddr() {
        ClientIpResolver resolver = new ClientIpResolver(true);
        MockHttpServletRequest request = requestWithRemoteAddr("198.51.100.10");
        request.addHeader("X-Forwarded-For", "203.0.113.10, not-an-ip");

        assertThat(resolver.resolve(request)).isEqualTo("198.51.100.10");
    }

    @Test
    void realIpFollowsTrustProxyPolicy() {
        MockHttpServletRequest request = requestWithRemoteAddr("198.51.100.10");
        request.addHeader("X-Real-IP", "203.0.113.11");

        assertThat(new ClientIpResolver(false).resolve(request)).isEqualTo("198.51.100.10");
        assertThat(new ClientIpResolver(true).resolve(request)).isEqualTo("203.0.113.11");
    }

    @Test
    void forwardedHeaderFollowsTrustProxyPolicy() {
        MockHttpServletRequest request = requestWithRemoteAddr("198.51.100.10");
        request.addHeader("Forwarded", "for=\"[2001:db8::1]\";proto=https");

        assertThat(new ClientIpResolver(false).resolve(request)).isEqualTo("198.51.100.10");
        assertThat(new ClientIpResolver(true).resolve(request)).isEqualTo("2001:db8:0:0:0:0:0:1");
    }

    @Test
    void ipv4PortIsStripped() {
        ClientIpResolver resolver = new ClientIpResolver(true);
        MockHttpServletRequest request = requestWithRemoteAddr("198.51.100.10");
        request.addHeader("X-Forwarded-For", "203.0.113.10:5443");

        assertThat(resolver.resolve(request)).isEqualTo("203.0.113.10");
    }

    private MockHttpServletRequest requestWithRemoteAddr(String remoteAddr) {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr(remoteAddr);
        return request;
    }
}
