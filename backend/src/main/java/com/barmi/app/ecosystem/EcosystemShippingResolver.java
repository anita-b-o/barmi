package com.barmi.app.ecosystem;

import com.barmi.domain.shipping.EcosystemShippingZone;
import com.barmi.domain.shipping.EcosystemShippingZoneType;
import com.barmi.infra.repo.EcosystemShippingZoneRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Component
public class EcosystemShippingResolver {

    private final EcosystemShippingZoneRepository ecosystemShippingZoneRepository;

    public EcosystemShippingResolver(EcosystemShippingZoneRepository ecosystemShippingZoneRepository) {
        this.ecosystemShippingZoneRepository = ecosystemShippingZoneRepository;
    }

    public Optional<EcosystemShippingZone> resolve(UUID ecosystemId, String postalCode) {
        if (postalCode == null) {
            return Optional.empty();
        }
        String normalized = postalCode.trim();
        if (normalized.isEmpty()) {
            return Optional.empty();
        }
        return ecosystemShippingZoneRepository
                .findExactActive(ecosystemId, EcosystemShippingZoneType.EXACT, normalized)
                .or(() -> findRangeMatch(ecosystemId, normalized));
    }

    private Optional<EcosystemShippingZone> findRangeMatch(UUID ecosystemId, String postalCode) {
        if (!postalCode.chars().allMatch(Character::isDigit)) {
            return Optional.empty();
        }

        int numeric;
        try {
            numeric = Integer.parseInt(postalCode);
        } catch (NumberFormatException ex) {
            return Optional.empty();
        }
        List<EcosystemShippingZone> zones = ecosystemShippingZoneRepository
                .findRangeActive(ecosystemId, EcosystemShippingZoneType.RANGE, numeric);

        if (zones.isEmpty()) return Optional.empty();
        if (zones.size() > 1) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "shipping_zone_conflict");
        }
        return Optional.of(zones.get(0));
    }
}
