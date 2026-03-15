package com.barmi.domain.auth;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "refresh_tokens")
public class RefreshToken {

    @Id
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(nullable = false, unique = true)
    private String token;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "revoked_at")
    private Instant revokedAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    protected RefreshToken() {}

    public RefreshToken(UUID id, UUID userId, String token, Instant expiresAt) {
        if (id == null) throw new IllegalArgumentException("id is required");
        if (userId == null) throw new IllegalArgumentException("userId is required");
        if (token == null || token.isBlank()) throw new IllegalArgumentException("token is required");
        if (expiresAt == null) throw new IllegalArgumentException("expiresAt is required");
        this.id = id;
        this.userId = userId;
        this.token = token;
        this.expiresAt = expiresAt;
    }

    public UUID getId() { return id; }
    public UUID getUserId() { return userId; }
    public String getToken() { return token; }
    public Instant getExpiresAt() { return expiresAt; }
    public Instant getRevokedAt() { return revokedAt; }
    public Instant getCreatedAt() { return createdAt; }

    public boolean isExpired(Instant now) {
        return expiresAt.isBefore(now);
    }

    public boolean isRevoked() {
        return revokedAt != null;
    }

    public void revoke() {
        this.revokedAt = Instant.now();
    }
}
