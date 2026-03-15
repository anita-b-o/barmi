package com.barmi.domain.ecosystem;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "ecosystem_members")
public class EcosystemMember {

    @Id
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "ecosystem_id", nullable = false)
    private UUID ecosystemId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EcosystemMemberRole role;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EcosystemMemberStatus status;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    protected EcosystemMember() {}

    public EcosystemMember(
            UUID id,
            UUID userId,
            UUID ecosystemId,
            EcosystemMemberRole role,
            EcosystemMemberStatus status
    ) {
        if (id == null) throw new IllegalArgumentException("id is required");
        if (userId == null) throw new IllegalArgumentException("userId is required");
        if (ecosystemId == null) throw new IllegalArgumentException("ecosystemId is required");
        if (role == null) throw new IllegalArgumentException("role is required");
        if (status == null) throw new IllegalArgumentException("status is required");
        this.id = id;
        this.userId = userId;
        this.ecosystemId = ecosystemId;
        this.role = role;
        this.status = status;
    }

    public UUID getId() { return id; }
    public UUID getUserId() { return userId; }
    public UUID getEcosystemId() { return ecosystemId; }
    public EcosystemMemberRole getRole() { return role; }
    public EcosystemMemberStatus getStatus() { return status; }
    public Instant getCreatedAt() { return createdAt; }
}
