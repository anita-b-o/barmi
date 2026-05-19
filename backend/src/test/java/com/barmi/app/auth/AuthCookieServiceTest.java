package com.barmi.app.auth;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletResponse;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

class AuthCookieServiceTest {

    @Test
    void writeRefreshTokenCookieUsesExplicitSecurityAttributes() {
        AuthCookieService service = new AuthCookieService(
                "barmi_refresh_token",
                "/api/auth",
                true,
                "Lax",
                "staging.example.com"
        );
        MockHttpServletResponse response = new MockHttpServletResponse();

        service.writeRefreshTokenCookie(
                response,
                "opaque-refresh-token",
                Instant.parse("2026-06-15T12:00:00Z")
        );

        String header = response.getHeader("Set-Cookie");
        assertThat(header).contains("barmi_refresh_token=opaque-refresh-token");
        assertThat(header).contains("HttpOnly");
        assertThat(header).contains("Secure");
        assertThat(header).contains("SameSite=Lax");
        assertThat(header).contains("Path=/api/auth");
        assertThat(header).contains("Domain=staging.example.com");
        assertThat(header).contains("Max-Age=");
    }

    @Test
    void clearRefreshTokenCookieKeepsSameAttributesAndExpiresImmediately() {
        AuthCookieService service = new AuthCookieService(
                "barmi_refresh_token",
                "/api/auth",
                true,
                "Lax",
                "staging.example.com"
        );
        MockHttpServletResponse response = new MockHttpServletResponse();

        service.clearRefreshTokenCookie(response);

        String header = response.getHeader("Set-Cookie");
        assertThat(header).contains("barmi_refresh_token=");
        assertThat(header).contains("HttpOnly");
        assertThat(header).contains("Secure");
        assertThat(header).contains("SameSite=Lax");
        assertThat(header).contains("Path=/api/auth");
        assertThat(header).contains("Domain=staging.example.com");
        assertThat(header).contains("Max-Age=0");
    }
}
