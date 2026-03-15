package com.barmi.app.fulfillment;

import com.barmi.app.security.StoreAuthorizationService;
import com.barmi.app.tenant.TenantContext;
import com.barmi.domain.fulfillment.StoreFulfillment;
import com.barmi.domain.store.Store;
import com.barmi.infra.repo.StoreFulfillmentRepository;
import com.barmi.infra.repo.StoreRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@Transactional(readOnly = true)
public class StoreFulfillmentQueryService {

    private final StoreRepository storeRepository;
    private final StoreFulfillmentRepository storeFulfillmentRepository;
    private final StoreAuthorizationService storeAuthorizationService;

    public StoreFulfillmentQueryService(
            StoreRepository storeRepository,
            StoreFulfillmentRepository storeFulfillmentRepository,
            StoreAuthorizationService storeAuthorizationService
    ) {
        this.storeRepository = storeRepository;
        this.storeFulfillmentRepository = storeFulfillmentRepository;
        this.storeAuthorizationService = storeAuthorizationService;
    }

    public List<StoreFulfillmentDto> list() {
        storeAuthorizationService.requireStaff();
        Store store = resolveStore();
        return storeFulfillmentRepository.findAllByStoreIdOrderByCreatedAtDesc(store.getId()).stream()
                .map(this::toDto)
                .toList();
    }

    public StoreFulfillmentDto getById(UUID fulfillmentId) {
        storeAuthorizationService.requireStaff();
        if (fulfillmentId == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "fulfillment_not_found");
        }

        Store store = resolveStore();
        StoreFulfillment fulfillment = storeFulfillmentRepository.findByIdAndStoreId(fulfillmentId, store.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "fulfillment_not_found"));

        return toDto(fulfillment);
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

    public StoreFulfillmentDto toDto(StoreFulfillment fulfillment) {
        return new StoreFulfillmentDto(
                fulfillment.getId(),
                fulfillment.getStoreOrderId(),
                fulfillment.getStoreId(),
                fulfillment.getStatus().name(),
                fulfillment.getMethod(),
                fulfillment.getCreatedAt()
        );
    }

    public record StoreFulfillmentDto(
            UUID fulfillmentId,
            UUID storeOrderId,
            UUID storeId,
            String status,
            String method,
            Instant createdAt
    ) {}
}
