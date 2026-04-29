package com.barmi.app.ecosystem;

import com.barmi.domain.ecosystem.Ecosystem;
import com.barmi.domain.enums.PaymentScope;
import com.barmi.domain.events.OutboxEvent;
import com.barmi.domain.fulfillment.EcosystemFulfillment;
import com.barmi.domain.fulfillment.FulfillmentStatus;
import com.barmi.domain.orders.EcosystemOrder;
import com.barmi.domain.orders.EcosystemOrderStatus;
import com.barmi.infra.repo.EcosystemFulfillmentRepository;
import com.barmi.infra.repo.EcosystemOrderRepository;
import com.barmi.infra.repo.EcosystemRepository;
import com.barmi.infra.repo.OutboxEventRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;
import java.util.UUID;

@Service
public class EcosystemFulfillmentService {
    private static final String DEFAULT_METHOD = "DELIVERY";
    private static final ObjectMapper MAPPER = new ObjectMapper();

    private final EcosystemRepository ecosystemRepository;
    private final EcosystemOrderRepository ecosystemOrderRepository;
    private final EcosystemFulfillmentRepository ecosystemFulfillmentRepository;
    private final OutboxEventRepository outboxEventRepository;

    public EcosystemFulfillmentService(
            EcosystemRepository ecosystemRepository,
            EcosystemOrderRepository ecosystemOrderRepository,
            EcosystemFulfillmentRepository ecosystemFulfillmentRepository,
            OutboxEventRepository outboxEventRepository
    ) {
        this.ecosystemRepository = ecosystemRepository;
        this.ecosystemOrderRepository = ecosystemOrderRepository;
        this.ecosystemFulfillmentRepository = ecosystemFulfillmentRepository;
        this.outboxEventRepository = outboxEventRepository;
    }

    @Transactional
    public EcosystemFulfillment create(UUID orderId) {
        if (orderId == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "missing_order_id");

        EcosystemOrder order = ecosystemOrderRepository.findById(orderId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "order_not_found"));

        Ecosystem ecosystem = ecosystemRepository.findById(order.getEcosystem().getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "ecosystem_not_found"));

        if (!ecosystem.isActive()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "ecosystem_inactive");
        }

        if (order.getStatus() != EcosystemOrderStatus.PAID) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "order_not_paid");
        }

        EcosystemFulfillment existing = ecosystemFulfillmentRepository.findByEcosystemOrderId(orderId).orElse(null);
        if (existing != null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "fulfillment_exists");
        }

        return createInternal(order, ecosystem, true);
    }

    @Transactional
    public EcosystemFulfillment createForPaidOrder(UUID orderId) {
        EcosystemOrder order = ecosystemOrderRepository.findById(orderId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "order_not_found"));

        Ecosystem ecosystem = ecosystemRepository.findById(order.getEcosystem().getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "ecosystem_not_found"));

        if (!ecosystem.isActive()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "ecosystem_inactive");
        }

        return createInternal(order, ecosystem, false);
    }

    private EcosystemFulfillment createInternal(EcosystemOrder order, Ecosystem ecosystem, boolean strict) {
        EcosystemFulfillment existing = ecosystemFulfillmentRepository.findByEcosystemOrderId(order.getId()).orElse(null);
        if (existing != null) {
            if (strict) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "fulfillment_exists");
            }
            return existing;
        }

        if (order.getStatus() != EcosystemOrderStatus.PAID) {
            if (strict) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "order_not_paid");
            }
            return null;
        }

        EcosystemFulfillment fulfillment = new EcosystemFulfillment(
                UUID.randomUUID(),
                order.getId(),
                ecosystem.getId(),
                DEFAULT_METHOD,
                FulfillmentStatus.PENDING
        );
        boolean created = false;
        try {
            ecosystemFulfillmentRepository.save(fulfillment);
            created = true;
        } catch (DataIntegrityViolationException ex) {
            EcosystemFulfillment reloaded = ecosystemFulfillmentRepository.findByEcosystemOrderId(order.getId()).orElse(null);
            if (reloaded != null) {
                if (strict) {
                    throw new ResponseStatusException(HttpStatus.CONFLICT, "fulfillment_exists");
                }
                return reloaded;
            }
            throw ex;
        }

        if (created) {
            Map<String, Object> payload = Map.of(
                    "fulfillmentId", fulfillment.getId(),
                    "ecosystemOrderId", fulfillment.getEcosystemOrderId(),
                    "ecosystemId", fulfillment.getEcosystemId(),
                    "status", fulfillment.getStatus().name(),
                    "method", fulfillment.getMethod()
            );

            OutboxEvent event = new OutboxEvent(
                    UUID.randomUUID(),
                    "ECOSYSTEM_FULFILLMENT_CREATED",
                    PaymentScope.ECOSYSTEM.name(),
                    fulfillment.getId(),
                    toJson(payload)
            );
            outboxEventRepository.save(event);
        }

        return fulfillment;
    }

    @Transactional
    public EcosystemFulfillment updateStatus(UUID fulfillmentId, FulfillmentStatus status) {
        if (fulfillmentId == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "missing_fulfillment_id");
        if (status == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "missing_status");

        EcosystemFulfillment fulfillment = ecosystemFulfillmentRepository.findById(fulfillmentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "fulfillment_not_found"));

        if (fulfillment.getStatus() == status) {
            return fulfillment;
        }

        try {
            fulfillment.changeStatus(status);
        } catch (IllegalStateException ex) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, ex.getMessage());
        }
        ecosystemFulfillmentRepository.save(fulfillment);

        Map<String, Object> payload = Map.of(
                "fulfillmentId", fulfillment.getId(),
                "ecosystemOrderId", fulfillment.getEcosystemOrderId(),
                "ecosystemId", fulfillment.getEcosystemId(),
                "status", fulfillment.getStatus().name(),
                "method", fulfillment.getMethod()
        );

        OutboxEvent event = new OutboxEvent(
                UUID.randomUUID(),
                "ECOSYSTEM_FULFILLMENT_STATUS_CHANGED",
                PaymentScope.ECOSYSTEM.name(),
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
