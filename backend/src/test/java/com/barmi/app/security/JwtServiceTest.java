package com.barmi.app.security;

import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class JwtServiceTest {

    @Test
    void distinguishesExpiredTokens() {
        JwtService jwtService = new JwtService("test-secret-please-change-32-bytes-minimum", -1);
        String token = jwtService.issueToken("user-1", Map.of("email", "demo@example.com"));

        JwtService.ParseResult result = jwtService.parseToken(token);

        assertThat(result.valid()).isFalse();
        assertThat(result.failureReason()).isEqualTo(JwtService.JwtFailureReason.EXPIRED);
    }

    @Test
    void distinguishesInvalidSignature() {
        JwtService issuer = new JwtService("test-secret-please-change-32-bytes-minimum", 60);
        JwtService parser = new JwtService("different-test-secret-please-change-32", 60);
        String token = issuer.issueToken("user-1", Map.of("email", "demo@example.com"));

        JwtService.ParseResult result = parser.parseToken(token);

        assertThat(result.valid()).isFalse();
        assertThat(result.failureReason()).isEqualTo(JwtService.JwtFailureReason.INVALID_SIGNATURE);
    }

    @Test
    void parsesValidTokens() {
        JwtService jwtService = new JwtService("test-secret-please-change-32-bytes-minimum", 60);
        String token = jwtService.issueToken("user-1", Map.of("email", "demo@example.com", "iat_hint", Instant.now().truncatedTo(ChronoUnit.SECONDS).toString()));

        JwtService.ParseResult result = jwtService.parseToken(token);

        assertThat(result.valid()).isTrue();
        assertThat(result.claims().getSubject()).isEqualTo("user-1");
        assertThat(result.failureReason()).isNull();
    }
}
