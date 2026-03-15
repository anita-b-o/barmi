package com.barmi.domain.store;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "stores")
public class Store {

    @Id
    private UUID id;

    @Column(nullable = false, unique = true)
    private String slug;

    @Column(nullable = false)
    private String name;

    @Column(name = "is_active", nullable = false)
    private boolean active = true;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    protected Store() {}

    public Store(UUID id, String slug, String name) {
        this.id = id;
        this.slug = slug;
        this.name = name;
    }

    public UUID getId() { return id; }
    public String getSlug() { return slug; }
    public String getName() { return name; }
    public boolean isActive() { return active; }
    public Instant getCreatedAt() { return createdAt; }
}
