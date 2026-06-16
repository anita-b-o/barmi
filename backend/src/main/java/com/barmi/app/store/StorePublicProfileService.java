package com.barmi.app.store;

import com.barmi.app.security.StoreAuthorizationService;
import com.barmi.domain.store.Store;
import com.barmi.infra.repo.StoreRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class StorePublicProfileService {
    public static final int PUBLIC_DESCRIPTION_MAX_LENGTH = 1000;
    public static final int PUBLIC_CONTACT_MAX_LENGTH = 160;

    private final StoreAuthorizationService storeAuthorizationService;
    private final StoreRepository storeRepository;

    public StorePublicProfileService(
            StoreAuthorizationService storeAuthorizationService,
            StoreRepository storeRepository
    ) {
        this.storeAuthorizationService = storeAuthorizationService;
        this.storeRepository = storeRepository;
    }

    @Transactional(readOnly = true)
    public StorePublicProfileDto getCurrentProfile() {
        storeAuthorizationService.requireAdmin();
        return toDto(storeAuthorizationService.requireCurrentStore());
    }

    @Transactional
    public StorePublicProfileDto updateCurrentProfile(StorePublicProfileUpdateRequest request) {
        storeAuthorizationService.requireAdmin();
        Store store = storeAuthorizationService.requireCurrentStore();
        String description = sanitize(request == null ? null : request.publicDescription(), PUBLIC_DESCRIPTION_MAX_LENGTH, "public_description_too_long");
        String email = sanitize(request == null ? null : request.publicEmail(), PUBLIC_CONTACT_MAX_LENGTH, "public_email_too_long");
        String phone = sanitize(request == null ? null : request.publicPhone(), PUBLIC_CONTACT_MAX_LENGTH, "public_phone_too_long");
        String whatsapp = sanitize(request == null ? null : request.publicWhatsapp(), PUBLIC_CONTACT_MAX_LENGTH, "public_whatsapp_too_long");
        store.updatePublicProfile(description, email, phone, whatsapp);
        return toDto(storeRepository.save(store));
    }

    public static StorePublicProfileDto toDto(Store store) {
        return new StorePublicProfileDto(
                store.getPublicDescription(),
                store.getPublicEmail(),
                store.getPublicPhone(),
                store.getPublicWhatsapp()
        );
    }

    private String sanitize(String value, int maxLength, String errorCode) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String normalized = value
                .replaceAll("\\p{Cntrl}", " ")
                .replaceAll("[ \\t\\x0B\\f\\r]+", " ")
                .replaceAll("\\n{3,}", "\n\n")
                .trim();
        if (normalized.isBlank()) {
            return null;
        }
        if (normalized.length() > maxLength) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, errorCode);
        }
        return normalized;
    }

    public record StorePublicProfileUpdateRequest(
            String publicDescription,
            String publicEmail,
            String publicPhone,
            String publicWhatsapp
    ) {}

    public record StorePublicProfileDto(
            String publicDescription,
            String publicEmail,
            String publicPhone,
            String publicWhatsapp
    ) {}
}
