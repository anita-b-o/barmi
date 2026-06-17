package com.barmi.domain.store;

import com.barmi.domain.ecosystem.Ecosystem;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "stores")
public class Store {
    public static final String DEFAULT_PRIMARY_COLOR = "#F65F55";
    public static final String DEFAULT_SECONDARY_COLOR = "#E5544A";

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

    @Enumerated(EnumType.STRING)
    @Column(name = "appearance_preset", nullable = false, length = 40)
    private StoreAppearancePreset appearancePreset = StoreAppearancePreset.MODERN;

    @Column(name = "logo_url", length = 500)
    private String logoUrl;

    @Column(name = "banner_url", length = 500)
    private String bannerUrl;

    @Column(name = "primary_color", nullable = false, length = 7)
    private String primaryColor = DEFAULT_PRIMARY_COLOR;

    @Column(name = "secondary_color", nullable = false, length = 7)
    private String secondaryColor = DEFAULT_SECONDARY_COLOR;

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

    public void updateAppearancePreset(StoreAppearancePreset appearancePreset) {
        this.appearancePreset = appearancePreset == null ? StoreAppearancePreset.MODERN : appearancePreset;
    }

    public void updateBranding(String logoUrl, String bannerUrl, String primaryColor, String secondaryColor) {
        this.logoUrl = logoUrl;
        this.bannerUrl = bannerUrl;
        this.primaryColor = primaryColor == null || primaryColor.isBlank() ? DEFAULT_PRIMARY_COLOR : primaryColor;
        this.secondaryColor = secondaryColor == null || secondaryColor.isBlank() ? DEFAULT_SECONDARY_COLOR : secondaryColor;
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
    public StoreAppearancePreset getAppearancePreset() { return appearancePreset == null ? StoreAppearancePreset.MODERN : appearancePreset; }
    public String getLogoUrl() { return logoUrl; }
    public String getBannerUrl() { return bannerUrl; }
    public String getPrimaryColor() { return primaryColor == null || primaryColor.isBlank() ? DEFAULT_PRIMARY_COLOR : primaryColor; }
    public String getSecondaryColor() { return secondaryColor == null || secondaryColor.isBlank() ? DEFAULT_SECONDARY_COLOR : secondaryColor; }
    public boolean hasPublicLocation() { return publicLatitude != null && publicLongitude != null; }
}
