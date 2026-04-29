package com.barmi.app.store;

import com.barmi.app.security.StoreAuthorizationService;
import com.barmi.domain.ecosystem.Ecosystem;
import com.barmi.domain.store.PublicStoreCategory;
import com.barmi.domain.store.Store;
import com.barmi.domain.store.StoreMember;
import com.barmi.domain.store.StoreMemberRole;
import com.barmi.infra.repo.EcosystemRepository;
import com.barmi.infra.repo.StoreRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Service
public class StorePublicDiscoveryAdminService {

    public record EcosystemOption(UUID id, String slug, String name) {}

    public record PublicCategoryOption(String key, String label) {}

    public record StoreDiscoverySettings(
            UUID storeId,
            String storeSlug,
            String storeName,
            String actorRole,
            EcosystemOption ecosystem,
            String publicCategoryKey,
            String publicLocationLabel,
            BigDecimal publicLatitude,
            BigDecimal publicLongitude,
            List<EcosystemOption> ecosystems,
            List<PublicCategoryOption> categories
    ) {}

    private final StoreAuthorizationService storeAuthorizationService;
    private final StoreRepository storeRepository;
    private final EcosystemRepository ecosystemRepository;

    public StorePublicDiscoveryAdminService(
            StoreAuthorizationService storeAuthorizationService,
            StoreRepository storeRepository,
            EcosystemRepository ecosystemRepository
    ) {
        this.storeAuthorizationService = storeAuthorizationService;
        this.storeRepository = storeRepository;
        this.ecosystemRepository = ecosystemRepository;
    }

    @Transactional(readOnly = true)
    public StoreDiscoverySettings getCurrentSettings() {
        storeAuthorizationService.requireAdmin();
        Store store = storeAuthorizationService.requireCurrentStore();
        StoreMember actor = storeAuthorizationService.requireCurrentActiveMember();
        return toSettings(store, actor.getRole());
    }

    @Transactional
    public StoreDiscoverySettings updateCurrentSettings(
            UUID ecosystemId,
            String publicCategoryKey,
            String publicLocationLabel,
            BigDecimal publicLatitude,
            BigDecimal publicLongitude
    ) {
        storeAuthorizationService.requireOwner();
        Store store = storeAuthorizationService.requireCurrentStore();
        StoreMember actor = storeAuthorizationService.requireCurrentActiveMember();

        Ecosystem ecosystem = resolveEcosystem(ecosystemId);
        validateCoordinates(publicLocationLabel, publicLatitude, publicLongitude);

        store.updateEcosystem(ecosystem);
        updatePublicCategory(store, publicCategoryKey);
        store.updatePublicLocation(normalizeBlank(publicLocationLabel), publicLatitude, publicLongitude);

        Store saved = storeRepository.save(store);
        return toSettings(saved, actor.getRole());
    }

    private StoreDiscoverySettings toSettings(Store store, StoreMemberRole actorRole) {
        Ecosystem ecosystem = store.getEcosystem();
        return new StoreDiscoverySettings(
                store.getId(),
                store.getSlug(),
                store.getName(),
                actorRole.name(),
                ecosystem == null ? null : new EcosystemOption(ecosystem.getId(), ecosystem.getSlug(), ecosystem.getName()),
                store.getPublicCategoryKey(),
                store.getPublicLocationLabel(),
                store.getPublicLatitude(),
                store.getPublicLongitude(),
                listEcosystems(),
                listPublicCategories()
        );
    }

    private List<EcosystemOption> listEcosystems() {
        return ecosystemRepository.findAll().stream()
                .filter(Ecosystem::isActive)
                .sorted(Comparator.comparing(Ecosystem::getName, String.CASE_INSENSITIVE_ORDER))
                .map(item -> new EcosystemOption(item.getId(), item.getSlug(), item.getName()))
                .toList();
    }

    private List<PublicCategoryOption> listPublicCategories() {
        return Arrays.stream(PublicStoreCategory.values())
                .map(item -> new PublicCategoryOption(item.getKey(), item.getLabel()))
                .toList();
    }

    private Ecosystem resolveEcosystem(UUID ecosystemId) {
        if (ecosystemId == null) {
            return null;
        }

        Ecosystem ecosystem = ecosystemRepository.findById(ecosystemId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid_ecosystem_id"));
        if (!ecosystem.isActive()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid_ecosystem_id");
        }
        return ecosystem;
    }

    private void validateCoordinates(String publicLocationLabel, BigDecimal publicLatitude, BigDecimal publicLongitude) {
        boolean hasLatitude = publicLatitude != null;
        boolean hasLongitude = publicLongitude != null;

        if (hasLatitude != hasLongitude) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid_public_coordinates");
        }

        if (hasLatitude) {
            if (normalizeBlank(publicLocationLabel) == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "public_location_label_required");
            }
            if (publicLatitude.compareTo(new BigDecimal("-90")) < 0 || publicLatitude.compareTo(new BigDecimal("90")) > 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid_public_latitude");
            }
            if (publicLongitude.compareTo(new BigDecimal("-180")) < 0 || publicLongitude.compareTo(new BigDecimal("180")) > 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid_public_longitude");
            }
        }
    }

    private void updatePublicCategory(Store store, String publicCategoryKey) {
        try {
            store.updatePublicCategoryKey(publicCategoryKey);
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid_public_category_key");
        }
    }

    private String normalizeBlank(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}
