package com.barmi.app.fulfillment;

import com.barmi.app.tenant.TenantContext;
import com.barmi.domain.enums.PaymentScope;
import com.barmi.domain.events.OutboxEvent;
import com.barmi.domain.fulfillment.FulfillmentStatus;
import com.barmi.domain.fulfillment.StoreFulfillment;
import com.barmi.domain.orders.StoreOrder;
import com.barmi.domain.orders.StoreOrderStatus;
import com.barmi.domain.store.Store;
import com.barmi.infra.repo.OutboxEventRepository;
import com.barmi.infra.repo.StoreFulfillmentRepository;
import com.barmi.infra.repo.StoreOrderRepository;
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
public class CreateFulfillmentForPaidOrderService {
    private static final String DEFAULT_METHOD = "DELIVERY";
    private static final ObjectMapper MAPPER = new ObjectMapper();

    private final StoreRepository storeRepository;
    private final StoreOrderRepository storeOrderRepository;
    private final StoreFulfillmentRepository storeFulfillmentRepository;
    private final OutboxEventRepository outboxEventRepository;

    public CreateFulfillmentForPaidOrderService(
            StoreRepository storeRepository,
            StoreOrderRepository storeOrderRepository,
            StoreFulfillmentRepository storeFulfillmentRepository,
            OutboxEventRepository outboxEventRepository
    ) {
        this.storeRepository = storeRepository;
        this.storeOrderRepository = storeOrderRepository;
        this.storeFulfillmentRepository = storeFulfillmentRepository;
        this.outboxEventRepository = outboxEventRepository;
    }

    @Transactional
    public StoreFulfillment create(UUID orderId) {
        if (orderId == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "missing_order_id");

        String storeSlug = TenantContext.getStoreSlug();
        if (storeSlug == null || storeSlug.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "store_context_required");
        }

        Store store = storeRepository.findBySlug(storeSlug)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "store_not_found"));

        if (!store.isActive()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "store_inactive");
        }

        StoreOrder order = storeOrderRepository.findById(orderId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "order_not_found"));

        if (!order.getStoreId().equals(store.getId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "order_not_found");
        }

        if (order.getStatus() != StoreOrderStatus.PAID) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "order_not_paid");
        }

        if (storeFulfillmentRepository.findByStoreOrderId(orderId).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "fulfillment_exists");
        }

        return createForPaidOrder(order, store);
    }

    @Transactional
    public StoreFulfillment createForPaidOrder(StoreOrder order) {
        Store store = storeRepository.findById(order.getStoreId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "store_not_found"));

        if (!store.isActive()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "store_inactive");
        }

        return createForPaidOrder(order, store);
    }

    private StoreFulfillment createForPaidOrder(StoreOrder order, Store store) {
        if (storeFulfillmentRepository.findByStoreOrderId(order.getId()).isPresent()) {
            return storeFulfillmentRepository.findByStoreOrderId(order.getId()).orElseThrow();
        }

        // TODO: fulfillment method selection will include pickup/delivery rules later.
        StoreFulfillment fulfillment = new StoreFulfillment(
                UUID.randomUUID(),
                order.getId(),
                store.getId(),
                DEFAULT_METHOD,
                FulfillmentStatus.PENDING
        );
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
                "STORE_FULFILLMENT_CREATED",
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
