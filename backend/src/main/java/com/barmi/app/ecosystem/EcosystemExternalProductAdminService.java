package com.barmi.app.ecosystem;

import com.barmi.domain.ecosystem.Ecosystem;
import com.barmi.domain.ecosystem.EcosystemExternalProduct;
import com.barmi.infra.repo.EcosystemExternalProductRepository;
import com.barmi.infra.repo.EcosystemRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Service
public class EcosystemExternalProductAdminService {

    private final EcosystemRepository ecosystemRepository;
    private final EcosystemExternalProductRepository ecosystemExternalProductRepository;

    public EcosystemExternalProductAdminService(
            EcosystemRepository ecosystemRepository,
            EcosystemExternalProductRepository ecosystemExternalProductRepository
    ) {
        this.ecosystemRepository = ecosystemRepository;
        this.ecosystemExternalProductRepository = ecosystemExternalProductRepository;
    }

    @Transactional
    public EcosystemExternalProduct create(
            UUID ecosystemId,
            String name,
            BigDecimal priceAmount,
            String currency,
            Boolean deliverySupported,
            Boolean isActive
    ) {
        Ecosystem ecosystem = requireActiveEcosystem(ecosystemId);

        if (name == null || name.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid_name");
        }
        if (priceAmount == null || priceAmount.compareTo(BigDecimal.ZERO) < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid_price");
        }
        if (currency == null || currency.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid_currency");
        }

        EcosystemExternalProduct product = new EcosystemExternalProduct(
                UUID.randomUUID(),
                ecosystem,
                name,
                priceAmount,
                currency,
                deliverySupported != null ? deliverySupported : true
        );
        if (isActive != null) {
            product.setActive(isActive);
        }

        return ecosystemExternalProductRepository.save(product);
    }

    @Transactional(readOnly = true)
    public EcosystemExternalProduct get(UUID id, UUID ecosystemId) {
        if (ecosystemId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "ecosystem_id_required");
        }
        return ecosystemExternalProductRepository.findByIdAndEcosystem_Id(id, ecosystemId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "product_not_found"));
    }

    @Transactional(readOnly = true)
    public List<EcosystemExternalProduct> list(UUID ecosystemId, boolean activeOnly, String query) {
        requireActiveEcosystem(ecosystemId);
        String normalizedQuery = (query == null || query.isBlank()) ? "" : query.trim();
        return ecosystemExternalProductRepository.findByEcosystemWithFilters(ecosystemId, activeOnly, normalizedQuery);
    }

    @Transactional
    public EcosystemExternalProduct update(
            UUID id,
            UUID ecosystemId,
            String name,
            BigDecimal priceAmount,
            String currency,
            Boolean deliverySupported,
            Boolean isActive
    ) {
        if (ecosystemId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "ecosystem_id_required");
        }
        EcosystemExternalProduct product = ecosystemExternalProductRepository.findByIdAndEcosystem_Id(id, ecosystemId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "product_not_found"));

        boolean anyField = false;
        if (name != null) {
            if (name.isBlank()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid_name");
            product.updateName(name);
            anyField = true;
        }
        if (priceAmount != null) {
            if (priceAmount.compareTo(BigDecimal.ZERO) < 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid_price");
            }
            product.updatePriceAmount(priceAmount);
            anyField = true;
        }
        if (currency != null) {
            if (currency.isBlank()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid_currency");
            product.updateCurrency(currency);
            anyField = true;
        }
        if (deliverySupported != null) {
            product.setDeliverySupported(deliverySupported);
            anyField = true;
        }
        if (isActive != null) {
            product.setActive(isActive);
            anyField = true;
        }

        if (!anyField) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "no_fields_to_update");
        }

        return ecosystemExternalProductRepository.save(product);
    }

    @Transactional
    public EcosystemExternalProduct softDelete(UUID id, UUID ecosystemId) {
        if (ecosystemId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "ecosystem_id_required");
        }
        EcosystemExternalProduct product = ecosystemExternalProductRepository.findByIdAndEcosystem_Id(id, ecosystemId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "product_not_found"));

        product.setActive(false);
        return ecosystemExternalProductRepository.save(product);
    }

    private Ecosystem requireActiveEcosystem(UUID ecosystemId) {
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
}
