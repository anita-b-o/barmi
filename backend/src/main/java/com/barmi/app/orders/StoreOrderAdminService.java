package com.barmi.app.orders;

import com.barmi.app.catalog.StoreStockService;
import com.barmi.app.fulfillment.CreateFulfillmentForPaidOrderService;
import com.barmi.app.security.StoreAuthorizationService;
import com.barmi.domain.enums.PaymentScope;
import com.barmi.domain.events.OutboxEvent;
import com.barmi.domain.orders.StoreOrder;
import com.barmi.domain.orders.StoreOrderStatus;
import com.barmi.domain.payments.Payment;
import com.barmi.domain.payments.PaymentStatus;
import com.barmi.domain.store.Store;
import com.barmi.infra.repo.OutboxEventRepository;
import com.barmi.infra.repo.PaymentRepository;
import com.barmi.infra.repo.StoreFulfillmentRepository;
import com.barmi.infra.repo.StoreOrderRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;
import java.util.UUID;

@Service
public class StoreOrderAdminService {
    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final String STOCK_CONFLICT_EVENT_TYPE = "STORE_ORDER_STOCK_CONFLICT";
    private static final String ORDER_PAID_EVENT_TYPE = "STORE_ORDER_PAID";
    private static final String ORDER_CANCELLED_EVENT_TYPE = "STORE_ORDER_MANUALLY_CANCELLED";

    private final StoreAuthorizationService storeAuthorizationService;
    private final StoreOrderRepository storeOrderRepository;
    private final StoreFulfillmentRepository storeFulfillmentRepository;
    private final PaymentRepository paymentRepository;
    private final OutboxEventRepository outboxEventRepository;
    private final StoreStockService storeStockService;
    private final CreateFulfillmentForPaidOrderService createFulfillmentForPaidOrderService;

    public StoreOrderAdminService(
            StoreAuthorizationService storeAuthorizationService,
            StoreOrderRepository storeOrderRepository,
            StoreFulfillmentRepository storeFulfillmentRepository,
            PaymentRepository paymentRepository,
            OutboxEventRepository outboxEventRepository,
            StoreStockService storeStockService,
            CreateFulfillmentForPaidOrderService createFulfillmentForPaidOrderService
    ) {
        this.storeAuthorizationService = storeAuthorizationService;
        this.storeOrderRepository = storeOrderRepository;
        this.storeFulfillmentRepository = storeFulfillmentRepository;
        this.paymentRepository = paymentRepository;
        this.outboxEventRepository = outboxEventRepository;
        this.storeStockService = storeStockService;
        this.createFulfillmentForPaidOrderService = createFulfillmentForPaidOrderService;
    }

    @Transactional
    public StoreOrder cancelOrder(UUID orderId) {
        storeAuthorizationService.requireAdmin();
        StoreOrder order = loadStoreOrder(orderId);

        if (storeFulfillmentRepository.findByStoreOrderId(orderId).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "order_has_fulfillment");
        }

        if (order.getStatus() == StoreOrderStatus.CANCELLED) {
            return order;
        }

        order.cancel();
        storeOrderRepository.save(order);

        if (!outboxEventRepository.existsByAggregateIdAndEventType(orderId, ORDER_CANCELLED_EVENT_TYPE)) {
            outboxEventRepository.save(new OutboxEvent(
                    UUID.randomUUID(),
                    ORDER_CANCELLED_EVENT_TYPE,
                    PaymentScope.STORE.name(),
                    orderId,
                    toJson(Map.of(
                            "storeOrderId", order.getId(),
                            "storeId", order.getStoreId(),
                            "status", order.getStatus().name(),
                            "reason", "MANUAL_ADMIN_ACTION"
                    ))
            ));
        }

        return order;
    }

    @Transactional
    public RetryProcessingResult retryProcessing(UUID orderId) {
        storeAuthorizationService.requireAdmin();
        StoreOrder order = loadStoreOrder(orderId);

        if (order.getStatus() == StoreOrderStatus.CANCELLED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "order_cancelled");
        }

        boolean hadStockConflict = outboxEventRepository.existsByAggregateIdAndEventType(orderId, STOCK_CONFLICT_EVENT_TYPE);

        Payment payment = paymentRepository.findFirstByScopeAndOperationIdAndStatus(
                        PaymentScope.STORE,
                        orderId,
                        PaymentStatus.CONFIRMED
                )
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.CONFLICT, "order_payment_not_confirmed"));

        if (!hadStockConflict) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "order_retry_not_available");
        }

        if (order.getStatus() == StoreOrderStatus.PAID) {
            var fulfillment = createFulfillmentForPaidOrderService.createForPaidOrder(order);
            return new RetryProcessingResult(order.getStatus(), true, false, fulfillment.getId());
        }

        StoreStockService.StockCommitResult stockCommitResult = storeStockService.commitPaidOrderStock(order);
        if (!stockCommitResult.applied()) {
            return new RetryProcessingResult(order.getStatus(), false, true, null);
        }

        order.markPaid();
        storeOrderRepository.save(order);

        if (!outboxEventRepository.existsByAggregateIdAndEventType(orderId, ORDER_PAID_EVENT_TYPE)) {
            outboxEventRepository.save(new OutboxEvent(
                    UUID.randomUUID(),
                    ORDER_PAID_EVENT_TYPE,
                    PaymentScope.STORE.name(),
                    orderId,
                    toJson(Map.of(
                            "storeOrderId", order.getId(),
                            "storeId", order.getStoreId(),
                            "paymentId", payment.getProviderPaymentId(),
                            "amount", payment.getAmount(),
                            "currency", payment.getCurrency(),
                            "source", "ADMIN_RETRY_PROCESSING"
                    ))
            ));
        }

        var fulfillment = createFulfillmentForPaidOrderService.createForPaidOrder(order);
        return new RetryProcessingResult(order.getStatus(), true, false, fulfillment.getId());
    }

    private StoreOrder loadStoreOrder(UUID orderId) {
        if (orderId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "missing_order_id");
        }

        Store store = storeAuthorizationService.requireCurrentStore();
        StoreOrder order = storeOrderRepository.findById(orderId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "store_order_not_found"));

        if (!order.getStoreId().equals(store.getId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "store_order_not_found");
        }
        return order;
    }

    private static String toJson(Object value) {
        try {
            return MAPPER.writeValueAsString(value);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("json_encode_failed", e);
        }
    }

    public record RetryProcessingResult(
            StoreOrderStatus status,
            boolean resolved,
            boolean stillConflicted,
            UUID fulfillmentId
    ) {}
}
