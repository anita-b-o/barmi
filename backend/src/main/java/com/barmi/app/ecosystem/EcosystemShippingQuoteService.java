package com.barmi.app.ecosystem;

import com.barmi.domain.ecosystem.Ecosystem;
import com.barmi.domain.shipping.EcosystemShippingZone;
import com.barmi.infra.repo.EcosystemRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.UUID;

@Service
public class EcosystemShippingQuoteService {

    private final EcosystemRepository ecosystemRepository;
    private final EcosystemShippingResolver ecosystemShippingResolver;

    public EcosystemShippingQuoteService(
            EcosystemRepository ecosystemRepository,
            EcosystemShippingResolver ecosystemShippingResolver
    ) {
        this.ecosystemRepository = ecosystemRepository;
        this.ecosystemShippingResolver = ecosystemShippingResolver;
    }

    public record QuoteResult(
            UUID ecosystemId,
            String postalCode,
            boolean available,
            UUID zoneId,
            String type,
            BigDecimal costAmount,
            String currency
    ) {}

    public QuoteResult quote(UUID ecosystemId, String postalCode) {
        if (ecosystemId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "missing_ecosystem_id");
        }
        if (postalCode == null || postalCode.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "missing_postal_code");
        }
        String normalizedPostalCode = postalCode.trim();

        Ecosystem ecosystem = ecosystemRepository.findById(ecosystemId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "ecosystem_not_found"));

        if (!ecosystem.isActive()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "ecosystem_inactive");
        }

        EcosystemShippingZone zone = ecosystemShippingResolver.resolve(ecosystemId, normalizedPostalCode).orElse(null);
        if (zone == null) {
            return new QuoteResult(ecosystemId, normalizedPostalCode, false, null, null, null, null);
        }

        BigDecimal cost = zone.getCostAmount().setScale(2, RoundingMode.HALF_UP);
        return new QuoteResult(
                ecosystemId,
                normalizedPostalCode,
                true,
                zone.getId(),
                zone.getType().name(),
                cost,
                zone.getCurrency()
        );
    }
}
