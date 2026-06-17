package com.barmi.app.store;

import com.barmi.app.security.StoreAuthorizationService;
import com.barmi.domain.store.Store;
import com.barmi.infra.repo.StoreRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class StoreBrandingService {
    public static final int BRANDING_URL_MAX_LENGTH = 500;
    private static final String HEX_COLOR_PATTERN = "^#[0-9A-Fa-f]{6}$";

    private final StoreAuthorizationService storeAuthorizationService;
    private final StoreRepository storeRepository;

    public StoreBrandingService(
            StoreAuthorizationService storeAuthorizationService,
            StoreRepository storeRepository
    ) {
        this.storeAuthorizationService = storeAuthorizationService;
        this.storeRepository = storeRepository;
    }

    @Transactional(readOnly = true)
    public StoreBrandingDto getCurrentBranding() {
        storeAuthorizationService.requireAdmin();
        return toDto(storeAuthorizationService.requireCurrentStore());
    }

    @Transactional
    public StoreBrandingDto updateCurrentBranding(StoreBrandingUpdateRequest request) {
        storeAuthorizationService.requireAdmin();
        Store store = storeAuthorizationService.requireCurrentStore();
        String logoUrl = sanitizeUrl(request == null ? null : request.logoUrl(), "logo_url_too_long");
        String bannerUrl = sanitizeUrl(request == null ? null : request.bannerUrl(), "banner_url_too_long");
        String primaryColor = sanitizeHexColor(request == null ? null : request.primaryColor(), Store.DEFAULT_PRIMARY_COLOR, "invalid_primary_color");
        String secondaryColor = sanitizeHexColor(request == null ? null : request.secondaryColor(), Store.DEFAULT_SECONDARY_COLOR, "invalid_secondary_color");
        store.updateBranding(logoUrl, bannerUrl, primaryColor, secondaryColor);
        return toDto(storeRepository.save(store));
    }

    public static StoreBrandingDto toDto(Store store) {
        return new StoreBrandingDto(
                store.getLogoUrl(),
                store.getBannerUrl(),
                store.getPrimaryColor(),
                store.getSecondaryColor()
        );
    }

    private String sanitizeUrl(String value, String errorCode) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String normalized = value.replaceAll("\\p{Cntrl}", "").trim();
        if (normalized.isBlank()) {
            return null;
        }
        if (normalized.length() > BRANDING_URL_MAX_LENGTH) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, errorCode);
        }
        return normalized;
    }

    private String sanitizeHexColor(String value, String fallback, String errorCode) {
        if (value == null || value.isBlank()) {
            return fallback;
        }
        String normalized = value.trim();
        if (!normalized.matches(HEX_COLOR_PATTERN)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, errorCode);
        }
        return normalized.toUpperCase();
    }

    public record StoreBrandingUpdateRequest(
            String logoUrl,
            String bannerUrl,
            String primaryColor,
            String secondaryColor
    ) {}

    public record StoreBrandingDto(
            String logoUrl,
            String bannerUrl,
            String primaryColor,
            String secondaryColor
    ) {}
}
