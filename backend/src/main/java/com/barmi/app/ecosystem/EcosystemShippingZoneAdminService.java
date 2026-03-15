package com.barmi.app.ecosystem;

import com.barmi.app.security.EcosystemAuthorizationService;
import com.barmi.domain.ecosystem.Ecosystem;
import com.barmi.domain.shipping.EcosystemShippingZone;
import com.barmi.domain.shipping.EcosystemShippingZoneType;
import com.barmi.infra.repo.EcosystemRepository;
import com.barmi.infra.repo.EcosystemShippingZoneRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class EcosystemShippingZoneAdminService {

    private static final String CONSTRAINT_EXACT_DUP = "ux_ecosystem_shipping_zones_ecosystem_postal_exact";
    private static final String CONSTRAINT_RANGE_OVERLAP = "ex_ecosystem_shipping_zones_range_overlap";

    private final EcosystemRepository ecosystemRepository;
    private final EcosystemShippingZoneRepository ecosystemShippingZoneRepository;
    private final EcosystemAuthorizationService ecosystemAuthorizationService;

    public EcosystemShippingZoneAdminService(
            EcosystemRepository ecosystemRepository,
            EcosystemShippingZoneRepository ecosystemShippingZoneRepository,
            EcosystemAuthorizationService ecosystemAuthorizationService
    ) {
        this.ecosystemRepository = ecosystemRepository;
        this.ecosystemShippingZoneRepository = ecosystemShippingZoneRepository;
        this.ecosystemAuthorizationService = ecosystemAuthorizationService;
    }

    @Transactional(readOnly = true)
    public List<EcosystemShippingZoneDto> list(UUID ecosystemId) {
        Ecosystem ecosystem = resolveEcosystem(ecosystemId);
        ecosystemAuthorizationService.requireAdmin(ecosystem.getId());
        return ecosystemShippingZoneRepository.findByEcosystemIdAndIsActiveTrueOrderByCreatedAtAsc(ecosystem.getId()).stream()
                .map(this::toDto)
                .toList();
    }

    public EcosystemShippingZoneDto create(
            UUID ecosystemId,
            String type,
            String postalCode,
            Integer rangeStart,
            Integer rangeEnd,
            BigDecimal costAmount,
            String currency
    ) {
        Ecosystem ecosystem = resolveEcosystem(ecosystemId);
        ecosystemAuthorizationService.requireAdmin(ecosystem.getId());
        EcosystemShippingZoneType zoneType = parseType(type);

        if (costAmount == null || costAmount.compareTo(BigDecimal.ZERO) < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid_cost_amount");
        }
        if (currency == null || currency.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "missing_currency");
        }

        if (zoneType == EcosystemShippingZoneType.EXACT) {
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

        EcosystemShippingZone zone = new EcosystemShippingZone(
                UUID.randomUUID(),
                ecosystem,
                zoneType,
                postalCode == null || postalCode.isBlank() ? null : postalCode,
                rangeStart,
                rangeEnd,
                costAmount,
                currency
        );

        try {
            return toDto(ecosystemShippingZoneRepository.saveAndFlush(zone));
        } catch (DataIntegrityViolationException e) {
            String message = constraintMessage(e);
            if (message.contains(CONSTRAINT_EXACT_DUP)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "shipping_zone_duplicate");
            }
            if (message.contains(CONSTRAINT_RANGE_OVERLAP)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "shipping_zone_overlap");
            }
            throw new ResponseStatusException(HttpStatus.CONFLICT, "shipping_zone_conflict");
        }
    }

    public EcosystemShippingZoneDto softDelete(UUID zoneId, UUID ecosystemId) {
        Ecosystem ecosystem = resolveEcosystem(ecosystemId);
        ecosystemAuthorizationService.requireAdmin(ecosystem.getId());

        EcosystemShippingZone zone = ecosystemShippingZoneRepository.findByIdAndEcosystemId(zoneId, ecosystem.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "shipping_zone_not_found"));

        zone.setActive(false);
        return toDto(zone);
    }

    private Ecosystem resolveEcosystem(UUID ecosystemId) {
        if (ecosystemId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "ecosystem_id_required");
        }

        Ecosystem ecosystem = ecosystemRepository.findById(ecosystemId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "ecosystem_not_found"));

        if (!ecosystem.isActive()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "ecosystem_inactive");
        }

        return ecosystem;
    }

    private EcosystemShippingZoneType parseType(String type) {
        if (type == null || type.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "missing_type");
        }
        try {
            return EcosystemShippingZoneType.valueOf(type);
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid_type");
        }
    }

    private EcosystemShippingZoneDto toDto(EcosystemShippingZone zone) {
        return new EcosystemShippingZoneDto(
                zone.getId(),
                zone.getEcosystem().getId(),
                zone.getType().name(),
                zone.getPostalCode(),
                zone.getRangeStart(),
                zone.getRangeEnd(),
                zone.getCostAmount(),
                zone.getCurrency(),
                zone.isActive(),
                zone.getCreatedAt()
        );
    }

    private String constraintMessage(DataIntegrityViolationException exception) {
        Throwable root = exception.getMostSpecificCause();
        if (root == null || root.getMessage() == null) {
            return "";
        }
        return root.getMessage().toLowerCase();
    }

    public record EcosystemShippingZoneDto(
            UUID zoneId,
            UUID ecosystemId,
            String type,
            String postalCode,
            Integer rangeStart,
            Integer rangeEnd,
            BigDecimal costAmount,
            String currency,
            boolean isActive,
            Instant createdAt
    ) {}
}
