package com.barmi.app.store;

import com.barmi.app.security.StoreAuthorizationService;
import com.barmi.domain.store.Store;
import com.barmi.domain.store.StoreAppearancePreset;
import com.barmi.infra.repo.StoreRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class StoreAppearanceService {
    private final StoreAuthorizationService storeAuthorizationService;
    private final StoreRepository storeRepository;

    public StoreAppearanceService(
            StoreAuthorizationService storeAuthorizationService,
            StoreRepository storeRepository
    ) {
        this.storeAuthorizationService = storeAuthorizationService;
        this.storeRepository = storeRepository;
    }

    @Transactional(readOnly = true)
    public StoreAppearanceDto getCurrentAppearance() {
        storeAuthorizationService.requireAdmin();
        return toDto(storeAuthorizationService.requireCurrentStore());
    }

    @Transactional
    public StoreAppearanceDto updateCurrentAppearance(StoreAppearanceUpdateRequest request) {
        storeAuthorizationService.requireAdmin();
        Store store = storeAuthorizationService.requireCurrentStore();
        StoreAppearancePreset preset = parsePreset(request == null ? null : request.preset());
        store.updateAppearancePreset(preset);
        return toDto(storeRepository.save(store));
    }

    private StoreAppearancePreset parsePreset(String value) {
        if (value == null || value.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "appearance_preset_required");
        }
        try {
            return StoreAppearancePreset.valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid_appearance_preset");
        }
    }

    public static StoreAppearanceDto toDto(Store store) {
        return new StoreAppearanceDto(store.getAppearancePreset().name());
    }

    public record StoreAppearanceUpdateRequest(String preset) {}

    public record StoreAppearanceDto(String preset) {}
}
