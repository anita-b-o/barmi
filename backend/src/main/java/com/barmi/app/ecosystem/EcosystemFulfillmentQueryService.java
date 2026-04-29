package com.barmi.app.ecosystem;

import com.barmi.app.security.EcosystemAuthorizationService;
import com.barmi.domain.fulfillment.EcosystemFulfillment;
import com.barmi.infra.repo.EcosystemFulfillmentRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@Transactional(readOnly = true)
public class EcosystemFulfillmentQueryService {

    private final EcosystemFulfillmentRepository ecosystemFulfillmentRepository;
    private final EcosystemAuthorizationService ecosystemAuthorizationService;

    public EcosystemFulfillmentQueryService(
            EcosystemFulfillmentRepository ecosystemFulfillmentRepository,
            EcosystemAuthorizationService ecosystemAuthorizationService
    ) {
        this.ecosystemFulfillmentRepository = ecosystemFulfillmentRepository;
        this.ecosystemAuthorizationService = ecosystemAuthorizationService;
    }

    public List<EcosystemFulfillmentDto> list(UUID ecosystemId, Instant createdFrom, Instant createdTo) {
        requireEcosystemId(ecosystemId);
        ecosystemAuthorizationService.requireStaff(ecosystemId);
        boolean applyCreatedFrom = createdFrom != null;
        boolean applyCreatedTo = createdTo != null;
        Instant createdFromInclusive = createdFrom == null ? Instant.EPOCH : createdFrom;
        Instant createdToExclusive = createdTo == null ? Instant.parse("9999-12-31T00:00:00Z") : createdTo;
        return ecosystemFulfillmentRepository.searchForAdmin(
                        ecosystemId,
                        applyCreatedFrom,
                        createdFromInclusive,
                        applyCreatedTo,
                        createdToExclusive
                ).stream()
                .map(this::toDto)
                .toList();
    }

    public EcosystemFulfillmentDto getById(UUID fulfillmentId, UUID ecosystemId) {
        requireEcosystemId(ecosystemId);
        ecosystemAuthorizationService.requireStaff(ecosystemId);
        if (fulfillmentId == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "fulfillment_not_found");
        }

        EcosystemFulfillment fulfillment = ecosystemFulfillmentRepository.findByIdAndEcosystemId(fulfillmentId, ecosystemId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "fulfillment_not_found"));

        return toDto(fulfillment);
    }

    public EcosystemFulfillmentDto toDto(EcosystemFulfillment fulfillment) {
        return new EcosystemFulfillmentDto(
                fulfillment.getId(),
                fulfillment.getEcosystemOrderId(),
                fulfillment.getEcosystemId(),
                fulfillment.getStatus().name(),
                fulfillment.getMethod(),
                fulfillment.getCreatedAt()
        );
    }

    private void requireEcosystemId(UUID ecosystemId) {
        if (ecosystemId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "ecosystem_id_required");
        }
    }

    public record EcosystemFulfillmentDto(
            UUID fulfillmentId,
            UUID ecosystemOrderId,
            UUID ecosystemId,
            String status,
            String method,
            Instant createdAt
    ) {}
}
