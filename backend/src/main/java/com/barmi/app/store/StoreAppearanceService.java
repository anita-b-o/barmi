package com.barmi.app.store;

import com.barmi.app.security.StoreAuthorizationService;
import com.barmi.domain.store.Store;
import com.barmi.domain.store.StoreAppearancePalette;
import com.barmi.domain.store.StoreAppearancePreset;
import com.barmi.domain.store.StoreAppearanceShape;
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
        StoreAppearancePalette palette = parsePalette(request == null ? null : request.palette());
        StoreAppearanceShape shape = parseShape(request == null ? null : request.shape());
        store.updateAppearance(preset, palette, shape);
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

    private StoreAppearancePalette parsePalette(String value) {
        if (value == null || value.isBlank()) {
            return StoreAppearancePalette.CORAL;
        }
        try {
            return StoreAppearancePalette.valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid_appearance_palette");
        }
    }

    private StoreAppearanceShape parseShape(String value) {
        if (value == null || value.isBlank()) {
            return StoreAppearanceShape.ROUNDED;
        }
        try {
            return StoreAppearanceShape.valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid_appearance_shape");
        }
    }

    public static StoreAppearanceDto toDto(Store store) {
        return new StoreAppearanceDto(
                store.getAppearancePreset().name(),
                store.getAppearancePalette().name(),
                store.getAppearanceShape().name()
        );
    }

    public record StoreAppearanceUpdateRequest(String preset, String palette, String shape) {}

    public record StoreAppearanceDto(String preset, String palette, String shape) {}
}
