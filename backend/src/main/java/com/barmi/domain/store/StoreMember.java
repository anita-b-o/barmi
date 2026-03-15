package com.barmi.domain.store;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "store_members")
public class StoreMember {

    @Id
    private UUID id;

    @Column(name = "store_id", nullable = false)
    private UUID storeId;

    @Column(name = "member_email", nullable = false)
    private String memberEmail;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private StoreMemberRole role;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private StoreMemberStatus status;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    protected StoreMember() {}

    public StoreMember(UUID id, UUID storeId, String memberEmail, StoreMemberRole role, StoreMemberStatus status) {
        if (id == null) throw new IllegalArgumentException("id is required");
        if (storeId == null) throw new IllegalArgumentException("storeId is required");
        if (memberEmail == null || memberEmail.isBlank()) throw new IllegalArgumentException("memberEmail is required");
        if (role == null) throw new IllegalArgumentException("role is required");
        if (status == null) throw new IllegalArgumentException("status is required");
        this.id = id;
        this.storeId = storeId;
        this.memberEmail = memberEmail;
        this.role = role;
        this.status = status;
    }

    public UUID getId() { return id; }
    public UUID getStoreId() { return storeId; }
    public String getMemberEmail() { return memberEmail; }
    public StoreMemberRole getRole() { return role; }
    public StoreMemberStatus getStatus() { return status; }
    public Instant getCreatedAt() { return createdAt; }

    public void updateRole(StoreMemberRole role) {
        if (role == null) throw new IllegalArgumentException("role is required");
        this.role = role;
    }

    public void updateStatus(StoreMemberStatus status) {
        if (status == null) throw new IllegalArgumentException("status is required");
        this.status = status;
    }
}
