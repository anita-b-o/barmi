package com.barmi.app.fulfillment;

import com.barmi.app.tenant.TenantContext;
import com.barmi.domain.enums.PaymentScope;
import com.barmi.domain.events.OutboxEvent;
import com.barmi.domain.fulfillment.FulfillmentStatus;
import com.barmi.domain.fulfillment.StoreFulfillment;
import com.barmi.domain.store.Store;
import com.barmi.infra.repo.OutboxEventRepository;
import com.barmi.infra.repo.StoreFulfillmentRepository;
import com.barmi.infra.repo.StoreRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;
import java.util.UUID;

@Service
public class UpdateFulfillmentStatusService {
    private static final ObjectMapper MAPPER = new ObjectMapper();

    private final StoreRepository storeRepository;
    private final StoreFulfillmentRepository storeFulfillmentRepository;
    private final OutboxEventRepository outboxEventRepository;

    public UpdateFulfillmentStatusService(
            StoreRepository storeRepository,
            StoreFulfillmentRepository storeFulfillmentRepository,
            OutboxEventRepository outboxEventRepository
    ) {
        this.storeRepository = storeRepository;
        this.storeFulfillmentRepository = storeFulfillmentRepository;
        this.outboxEventRepository = outboxEventRepository;
    }

    @Transactional
    public StoreFulfillment updateStatus(UUID fulfillmentId, FulfillmentStatus status) {
        if (fulfillmentId == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "missing_fulfillment_id");
        if (status == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "missing_status");

        String storeSlug = TenantContext.getStoreSlug();
        if (storeSlug == null || storeSlug.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "store_context_required");
        }

        Store store = storeRepository.findBySlug(storeSlug)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "store_not_found"));

        if (!store.isActive()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "store_inactive");
        }

        StoreFulfillment fulfillment = storeFulfillmentRepository.findById(fulfillmentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "fulfillment_not_found"));

        if (!fulfillment.getStoreId().equals(store.getId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "fulfillment_not_found");
        }

        fulfillment.changeStatus(status);
        storeFulfillmentRepository.save(fulfillment);

        Map<String, Object> payload = Map.of(
                "fulfillmentId", fulfillment.getId(),
                "storeOrderId", fulfillment.getStoreOrderId(),
                "storeId", fulfillment.getStoreId(),
                "status", fulfillment.getStatus().name(),
                "method", fulfillment.getMethod()
        );

        OutboxEvent event = new OutboxEvent(
                UUID.randomUUID(),
                "STORE_FULFILLMENT_STATUS_CHANGED",
                PaymentScope.STORE.name(),
                fulfillment.getId(),
                toJson(payload)
        );
        outboxEventRepository.save(event);

        return fulfillment;
    }

    private static String toJson(Object value) {
        try {
            return MAPPER.writeValueAsString(value);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("json_encode_failed", e);
        }
    }
}
