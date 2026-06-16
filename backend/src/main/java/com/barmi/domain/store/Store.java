package com.barmi.domain.store;

import com.barmi.domain.ecosystem.Ecosystem;
import jakarta.persistence.*;
import java.math.BigDecimal;
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

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ecosystem_id")
    private Ecosystem ecosystem;

    @Column(name = "public_location_label")
    private String publicLocationLabel;

    @Column(name = "public_latitude", precision = 9, scale = 6)
    private BigDecimal publicLatitude;

    @Column(name = "public_longitude", precision = 9, scale = 6)
    private BigDecimal publicLongitude;

    @Column(name = "public_category_key")
    private String publicCategoryKey;

    @Column(name = "public_description", length = 1000)
    private String publicDescription;

    @Column(name = "public_email", length = 160)
    private String publicEmail;

    @Column(name = "public_phone", length = 160)
    private String publicPhone;

    @Column(name = "public_whatsapp", length = 160)
    private String publicWhatsapp;

    protected Store() {}

    public Store(UUID id, String slug, String name) {
        this(id, slug, name, null, null, null, null);
    }

    public Store(UUID id, String slug, String name, Ecosystem ecosystem) {
        this(id, slug, name, ecosystem, null, null, null);
    }

    public Store(
            UUID id,
            String slug,
            String name,
            Ecosystem ecosystem,
            String publicLocationLabel,
            BigDecimal publicLatitude,
            BigDecimal publicLongitude
    ) {
        this.id = id;
        this.slug = slug;
        this.name = name;
        this.ecosystem = ecosystem;
        updatePublicLocation(publicLocationLabel, publicLatitude, publicLongitude);
    }

    public Store(
            UUID id,
            String slug,
            String name,
            String publicLocationLabel,
            BigDecimal publicLatitude,
            BigDecimal publicLongitude
    ) {
        this(id, slug, name, null, publicLocationLabel, publicLatitude, publicLongitude);
    }

    public void updatePublicLocation(String publicLocationLabel, BigDecimal publicLatitude, BigDecimal publicLongitude) {
        boolean hasLatitude = publicLatitude != null;
        boolean hasLongitude = publicLongitude != null;

        if (hasLatitude != hasLongitude) {
            throw new IllegalArgumentException("public latitude and longitude must both be provided");
        }

        if (!hasLatitude) {
            this.publicLocationLabel = publicLocationLabel == null || publicLocationLabel.isBlank() ? null : publicLocationLabel.trim();
            this.publicLatitude = null;
            this.publicLongitude = null;
            return;
        }

        this.publicLocationLabel = publicLocationLabel == null || publicLocationLabel.isBlank() ? null : publicLocationLabel.trim();
        this.publicLatitude = publicLatitude;
        this.publicLongitude = publicLongitude;
    }

    public void updatePublicCategoryKey(String publicCategoryKey) {
        this.publicCategoryKey = publicCategoryKey == null || publicCategoryKey.isBlank()
                ? null
                : PublicStoreCategory.normalizeKey(publicCategoryKey);
    }

    public void updatePublicProfile(String publicDescription, String publicEmail, String publicPhone, String publicWhatsapp) {
        this.publicDescription = publicDescription;
        this.publicEmail = publicEmail;
        this.publicPhone = publicPhone;
        this.publicWhatsapp = publicWhatsapp;
    }

    public void updateEcosystem(Ecosystem ecosystem) {
        this.ecosystem = ecosystem;
    }

    public UUID getId() { return id; }
    public String getSlug() { return slug; }
    public String getName() { return name; }
    public boolean isActive() { return active; }
    public Instant getCreatedAt() { return createdAt; }
    public Ecosystem getEcosystem() { return ecosystem; }
    public String getPublicLocationLabel() { return publicLocationLabel; }
    public BigDecimal getPublicLatitude() { return publicLatitude; }
    public BigDecimal getPublicLongitude() { return publicLongitude; }
    public String getPublicCategoryKey() { return publicCategoryKey; }
    public String getPublicDescription() { return publicDescription; }
    public String getPublicEmail() { return publicEmail; }
    public String getPublicPhone() { return publicPhone; }
    public String getPublicWhatsapp() { return publicWhatsapp; }
    public boolean hasPublicLocation() { return publicLatitude != null && publicLongitude != null; }
}
