package com.barmi.app.shipping;

import com.barmi.app.tenant.TenantContext;
import com.barmi.domain.shipping.ShippingZoneType;
import com.barmi.domain.shipping.StoreShippingZone;
import com.barmi.domain.store.Store;
import com.barmi.infra.repo.StoreRepository;
import com.barmi.infra.repo.StoreShippingZoneRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@Service
public class StoreShippingQuoteService {

    private final StoreRepository storeRepository;
    private final StoreShippingZoneRepository storeShippingZoneRepository;

    public StoreShippingQuoteService(
            StoreRepository storeRepository,
            StoreShippingZoneRepository storeShippingZoneRepository
    ) {
        this.storeRepository = storeRepository;
        this.storeShippingZoneRepository = storeShippingZoneRepository;
    }

    public StoreShippingZone quote(String postalCode) {
        if (postalCode == null || postalCode.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "postal_code_required");
        }

        UUID storeId = resolveStoreId();

        return storeShippingZoneRepository
                .findByStoreIdAndTypeAndPostalCode(storeId, ShippingZoneType.EXACT, postalCode)
                .orElseGet(() -> findRangeMatch(storeId, postalCode)
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "shipping_not_available"))
                );
    }

    private UUID resolveStoreId() {
        String storeSlug = TenantContext.getStoreSlug();
        if (storeSlug == null || storeSlug.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "store_context_required");
        }

        Store store = storeRepository.findBySlug(storeSlug)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "store_not_found"));

        if (!store.isActive()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "store_inactive");
        }

        return store.getId();
    }

    private java.util.Optional<StoreShippingZone> findRangeMatch(UUID storeId, String postalCode) {
        if (!postalCode.chars().allMatch(Character::isDigit)) {
            return java.util.Optional.empty();
        }

        int numeric = Integer.parseInt(postalCode);
        List<StoreShippingZone> zones = storeShippingZoneRepository
                .findRangeByStoreIdAndPostalCodeNumeric(storeId, ShippingZoneType.RANGE, numeric);

        if (zones.isEmpty()) return java.util.Optional.empty();
        if (zones.size() > 1) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "shipping_zone_conflict");
        }
        return java.util.Optional.of(zones.get(0));
    }
}
