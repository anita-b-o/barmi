package com.barmi.domain.users;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "users")
public class User {

    @Id
    private UUID id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private UserStatus status;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    protected User() {}

    public User(UUID id, String email, String passwordHash, UserStatus status) {
        if (id == null) throw new IllegalArgumentException("id is required");
        if (email == null || email.isBlank()) throw new IllegalArgumentException("email is required");
        if (passwordHash == null || passwordHash.isBlank()) throw new IllegalArgumentException("passwordHash is required");
        if (status == null) throw new IllegalArgumentException("status is required");
        this.id = id;
        this.email = email;
        this.passwordHash = passwordHash;
        this.status = status;
    }

    public UUID getId() { return id; }
    public String getEmail() { return email; }
    public String getPasswordHash() { return passwordHash; }
    public UserStatus getStatus() { return status; }
    public Instant getCreatedAt() { return createdAt; }
}
