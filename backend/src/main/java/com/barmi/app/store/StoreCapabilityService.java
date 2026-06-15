package com.barmi.app.store;

import com.barmi.app.security.StoreAuthorizationService;
import com.barmi.domain.store.Store;
import com.barmi.domain.store.StoreCapability;
import com.barmi.domain.store.StoreCapabilitySetting;
import com.barmi.infra.repo.StoreCapabilitySettingRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;

@Service
@Transactional
public class StoreCapabilityService {

    private static final EnumSet<StoreCapability> ECOMMERCE_DEFAULTS = EnumSet.of(
            StoreCapability.ABOUT,
            StoreCapability.PRODUCTS,
            StoreCapability.PROMOTIONS,
            StoreCapability.SHIPPING,
            StoreCapability.CHECKOUT,
            StoreCapability.CONTACT
    );

    private final StoreAuthorizationService storeAuthorizationService;
    private final StoreCapabilitySettingRepository storeCapabilitySettingRepository;

    public StoreCapabilityService(
            StoreAuthorizationService storeAuthorizationService,
            StoreCapabilitySettingRepository storeCapabilitySettingRepository
    ) {
        this.storeAuthorizationService = storeAuthorizationService;
        this.storeCapabilitySettingRepository = storeCapabilitySettingRepository;
    }

    @Transactional
    public StoreCapabilitiesDto getCurrentStoreCapabilities() {
        storeAuthorizationService.requireAdmin();
        Store store = storeAuthorizationService.requireCurrentStore();
        ensureDefaults(store.getId());
        return toDto(storeCapabilitySettingRepository.findAllByStoreIdOrderByCapabilityAsc(store.getId()));
    }

    public StoreCapabilitiesDto updateCurrentStoreCapabilities(Collection<String> enabledKeys) {
        storeAuthorizationService.requireAdmin();
        Store store = storeAuthorizationService.requireCurrentStore();
        EnumSet<StoreCapability> enabled = parseCapabilities(enabledKeys);
        ensureDefaults(store.getId());

        Map<StoreCapability, StoreCapabilitySetting> settingsByCapability = mapByCapability(
                storeCapabilitySettingRepository.findAllByStoreIdOrderByCapabilityAsc(store.getId())
        );
        for (StoreCapability capability : StoreCapability.values()) {
            StoreCapabilitySetting setting = settingsByCapability.get(capability);
            if (setting == null) {
                setting = new StoreCapabilitySetting(UUID.randomUUID(), store.getId(), capability, false);
                settingsByCapability.put(capability, setting);
            }
            setting.setEnabled(enabled.contains(capability));
            storeCapabilitySettingRepository.save(setting);
        }

        return toDto(settingsByCapability.values());
    }

    public void ensureDefaults(UUID storeId) {
        if (storeId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "store_id_required");
        }

        for (StoreCapability capability : StoreCapability.values()) {
            storeCapabilitySettingRepository.findByStoreIdAndCapability(storeId, capability)
                    .orElseGet(() -> storeCapabilitySettingRepository.save(new StoreCapabilitySetting(
                            UUID.randomUUID(),
                            storeId,
                            capability,
                            ECOMMERCE_DEFAULTS.contains(capability)
                    )));
        }
    }

    public List<String> getEnabledCapabilityNamesForStore(UUID storeId) {
        ensureDefaults(storeId);
        Set<StoreCapability> enabled = EnumSet.noneOf(StoreCapability.class);
        for (StoreCapabilitySetting setting : storeCapabilitySettingRepository.findAllByStoreIdOrderByCapabilityAsc(storeId)) {
            if (setting.isEnabled()) {
                enabled.add(setting.getCapability());
            }
        }
        return StoreCapabilityMetadata.available().stream()
                .map(StoreCapabilityMetadata::key)
                .filter(enabled::contains)
                .map(Enum::name)
                .toList();
    }

    private EnumSet<StoreCapability> parseCapabilities(Collection<String> enabledKeys) {
        if (enabledKeys == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "enabled_required");
        }
        EnumSet<StoreCapability> enabled = EnumSet.noneOf(StoreCapability.class);
        for (String key : enabledKeys) {
            if (key == null || key.isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid_capability");
            }
            try {
                enabled.add(StoreCapability.valueOf(key.trim().toUpperCase(Locale.ROOT)));
            } catch (IllegalArgumentException ex) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid_capability");
            }
        }
        return enabled;
    }

    private StoreCapabilitiesDto toDto(Collection<StoreCapabilitySetting> settings) {
        Set<StoreCapability> enabled = EnumSet.noneOf(StoreCapability.class);
        for (StoreCapabilitySetting setting : settings) {
            if (setting.isEnabled()) {
                enabled.add(setting.getCapability());
            }
        }
        return new StoreCapabilitiesDto(
                StoreCapabilityMetadata.available().stream()
                        .map(StoreCapabilityMetadata::key)
                        .filter(enabled::contains)
                        .map(Enum::name)
                        .toList(),
                StoreCapabilityMetadata.available()
        );
    }

    private Map<StoreCapability, StoreCapabilitySetting> mapByCapability(List<StoreCapabilitySetting> settings) {
        EnumMap<StoreCapability, StoreCapabilitySetting> mapped = new EnumMap<>(StoreCapability.class);
        for (StoreCapabilitySetting setting : settings) {
            mapped.put(setting.getCapability(), setting);
        }
        return mapped;
    }

    public record StoreCapabilitiesUpdateRequest(List<String> enabled) {}

    public record StoreCapabilitiesDto(
            List<String> enabled,
            List<StoreCapabilityMetadata> available
    ) {}

    public record StoreCapabilityMetadata(
            StoreCapability key,
            String label,
            String description
    ) {
        private static List<StoreCapabilityMetadata> available() {
            return List.of(
                    new StoreCapabilityMetadata(StoreCapability.ABOUT, "Sobre mí", "Presentá tu negocio o actividad."),
                    new StoreCapabilityMetadata(StoreCapability.GALLERY, "Galería", "Mostrá fotos, trabajos o ambientes."),
                    new StoreCapabilityMetadata(StoreCapability.BLOG, "Blog", "Publicá novedades o artículos."),
                    new StoreCapabilityMetadata(StoreCapability.PRODUCTS, "Productos", "Mostrá productos o menú."),
                    new StoreCapabilityMetadata(StoreCapability.RESERVATIONS, "Reservas", "Permití agenda o turnos."),
                    new StoreCapabilityMetadata(StoreCapability.PROMOTIONS, "Promociones", "Mostrá descuentos o beneficios."),
                    new StoreCapabilityMetadata(StoreCapability.SHIPPING, "Envíos", "Configurá cobertura y costos de envío."),
                    new StoreCapabilityMetadata(StoreCapability.CHECKOUT, "Checkout", "Permití compras online."),
                    new StoreCapabilityMetadata(StoreCapability.CONTACT, "Contacto", "Mostrá vías de contacto.")
            );
        }
    }
}
