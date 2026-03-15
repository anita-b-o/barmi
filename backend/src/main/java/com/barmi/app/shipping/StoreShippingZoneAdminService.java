package com.barmi.app.shipping;

import com.barmi.app.tenant.TenantContext;
import com.barmi.domain.shipping.ShippingZoneType;
import com.barmi.domain.shipping.StoreShippingZone;
import com.barmi.domain.store.Store;
import com.barmi.infra.repo.StoreRepository;
import com.barmi.infra.repo.StoreShippingZoneRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Service
public class StoreShippingZoneAdminService {

    private static final String CONSTRAINT_EXACT_DUP = "ux_store_shipping_zones_store_postal_exact";
    private static final String CONSTRAINT_RANGE_OVERLAP = "ex_store_shipping_zones_range_overlap";

    private final StoreRepository storeRepository;
    private final StoreShippingZoneRepository storeShippingZoneRepository;

    public StoreShippingZoneAdminService(
            StoreRepository storeRepository,
            StoreShippingZoneRepository storeShippingZoneRepository
    ) {
        this.storeRepository = storeRepository;
        this.storeShippingZoneRepository = storeShippingZoneRepository;
    }

    public StoreShippingZone createZone(
            String type,
            String postalCode,
            Integer rangeStart,
            Integer rangeEnd,
            BigDecimal costAmount,
            String currency
    ) {
        ShippingZoneType zoneType = parseType(type);

        if (costAmount == null || costAmount.compareTo(BigDecimal.ZERO) < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid_cost_amount");
        }
        if (currency == null || currency.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "missing_currency");
        }

        if (zoneType == ShippingZoneType.EXACT) {
            if (postalCode == null || postalCode.isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "postal_code_required");
            }
            if (rangeStart != null || rangeEnd != null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "range_not_allowed_for_exact");
            }
        } else {
            if (postalCode != null && !postalCode.isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "postal_code_not_allowed_for_range");
            }
            if (rangeStart == null || rangeEnd == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "range_required");
            }
            if (rangeStart > rangeEnd) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "range_invalid");
            }
        }

        Store store = resolveStore();

        StoreShippingZone zone = new StoreShippingZone(
                UUID.randomUUID(),
                store.getId(),
                zoneType,
                postalCode == null || postalCode.isBlank() ? null : postalCode,
                rangeStart,
                rangeEnd,
                costAmount,
                currency
        );

        try {
            return storeShippingZoneRepository.save(zone);
        } catch (DataIntegrityViolationException e) {
            String message = e.getMostSpecificCause() == null ? "" : e.getMostSpecificCause().getMessage();
            if (message.contains(CONSTRAINT_EXACT_DUP)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "shipping_zone_duplicate");
            }
            if (message.contains(CONSTRAINT_RANGE_OVERLAP)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "shipping_zone_overlap");
            }
            throw new ResponseStatusException(HttpStatus.CONFLICT, "shipping_zone_conflict");
        }
    }

    public List<StoreShippingZone> listZones() {
        Store store = resolveStore();
        return storeShippingZoneRepository.findByStoreIdOrderByCreatedAtAsc(store.getId());
    }

    public void deleteZone(UUID zoneId) {
        if (zoneId == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "missing_zone_id");
        Store store = resolveStore();

        StoreShippingZone zone = storeShippingZoneRepository.findById(zoneId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "shipping_zone_not_found"));

        if (!zone.getStoreId().equals(store.getId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "shipping_zone_not_found");
        }

        storeShippingZoneRepository.delete(zone);
    }

    private Store resolveStore() {
        String storeSlug = TenantContext.getStoreSlug();
        if (storeSlug == null || storeSlug.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "store_context_required");
        }

        Store store = storeRepository.findBySlug(storeSlug)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "store_not_found"));

        if (!store.isActive()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "store_inactive");
        }

        return store;
    }

    private ShippingZoneType parseType(String type) {
        if (type == null || type.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "missing_type");
        }
        try {
            return ShippingZoneType.valueOf(type);
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid_type");
        }
    }
}
