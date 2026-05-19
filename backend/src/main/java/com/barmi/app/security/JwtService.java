package com.barmi.app.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.UnsupportedJwtException;
import io.jsonwebtoken.security.Keys;
import io.jsonwebtoken.security.SecurityException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import java.util.Map;

@Service
public class JwtService {

    public enum JwtFailureReason {
        EXPIRED("token_expired"),
        INVALID_SIGNATURE("invalid_signature"),
        MALFORMED("malformed_token"),
        INVALID("invalid_token");

        private final String code;

        JwtFailureReason(String code) {
            this.code = code;
        }

        public String code() {
            return code;
        }
    }

    public record ParseResult(Claims claims, JwtFailureReason failureReason) {
        public boolean valid() {
            return claims != null;
        }
    }

    private final SecretKey key;
    private final long ttlMinutes;

    public JwtService(@Value("${app.security.jwtSecret}") String secret,
                      @Value("${app.security.jwtTtlMinutes}") long ttlMinutes) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes());
        this.ttlMinutes = ttlMinutes;
    }

    public String issueToken(String subject, Map<String, Object> claims) {
        Instant now = Instant.now();
        Instant exp = now.plus(ttlMinutes, ChronoUnit.MINUTES);

        return Jwts.builder()
                .setSubject(subject)
                .addClaims(claims)
                .setIssuedAt(Date.from(now))
                .setExpiration(Date.from(exp))
                .signWith(key)
                .compact();
    }

    public ParseResult parseToken(String token) {
        try {
            Claims claims = Jwts.parserBuilder()
                    .setSigningKey(key)
                    .build()
                    .parseClaimsJws(token)
                    .getBody();
            return new ParseResult(claims, null);
        } catch (ExpiredJwtException ex) {
            return new ParseResult(null, JwtFailureReason.EXPIRED);
        } catch (SecurityException ex) {
            return new ParseResult(null, JwtFailureReason.INVALID_SIGNATURE);
        } catch (MalformedJwtException | UnsupportedJwtException ex) {
            return new ParseResult(null, JwtFailureReason.MALFORMED);
        } catch (JwtException ex) {
            return new ParseResult(null, JwtFailureReason.INVALID);
        }
    }

    public Instant computeExpiry() {
        return computeExpiry(Instant.now());
    }

    public Instant computeExpiry(Instant issuedAt) {
        return issuedAt.plus(ttlMinutes, ChronoUnit.MINUTES);
    }
}
