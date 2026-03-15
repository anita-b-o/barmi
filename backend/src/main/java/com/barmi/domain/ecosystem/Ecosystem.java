package com.barmi.domain.ecosystem;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "ecosystems")
public class Ecosystem {

    @Id
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String slug;

    @Column(name = "is_active", nullable = false)
    private boolean active = true;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    protected Ecosystem() {}

    public Ecosystem(UUID id, String name, String slug) {
        this.id = id;
        this.name = name;
        this.slug = slug;
    }

    public UUID getId() { return id; }
    public String getName() { return name; }
    public String getSlug() { return slug; }
    public boolean isActive() { return active; }
    public Instant getCreatedAt() { return createdAt; }
}
