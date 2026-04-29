package com.barmi.app.orders;

import com.barmi.app.tenant.TenantContext;
import com.barmi.domain.enums.PaymentScope;
import com.barmi.domain.events.OutboxEvent;
import com.barmi.domain.orders.StoreOrder;
import com.barmi.domain.orders.StoreOrderItem;
import com.barmi.domain.orders.StoreOrderStatus;
import com.barmi.domain.payments.PaymentIntent;
import com.barmi.domain.payments.PaymentStatus;
import com.barmi.domain.store.Store;
import com.barmi.infra.repo.OutboxEventRepository;
import com.barmi.infra.repo.PaymentIntentRepository;
import com.barmi.infra.repo.PaymentRepository;
import com.barmi.infra.repo.StoreFulfillmentRepository;
import com.barmi.infra.repo.StoreOrderRepository;
import com.barmi.infra.repo.StoreRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.NOT_FOUND;

@Service
public class StoreOrderQueryService {
    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final Set<String> ALLOWED_SORT_FIELDS = Set.of("createdAt");
    private static final String STOCK_CONFLICT_EVENT_TYPE = "STORE_ORDER_STOCK_CONFLICT";
    private static final String ORDER_MANUALLY_CANCELLED_EVENT_TYPE = "STORE_ORDER_MANUALLY_CANCELLED";
    private static final Instant MIN_FILTER_INSTANT = Instant.parse("2000-01-01T00:00:00Z");
    private static final Instant MAX_FILTER_INSTANT = Instant.parse("9999-12-31T23:59:59Z");

    private final StoreRepository storeRepository;
    private final StoreOrderRepository storeOrderRepository;
    private final PaymentIntentRepository paymentIntentRepository;
    private final PaymentRepository paymentRepository;
    private final OutboxEventRepository outboxEventRepository;
    private final StoreFulfillmentRepository storeFulfillmentRepository;

    public StoreOrderQueryService(
            StoreRepository storeRepository,
            StoreOrderRepository storeOrderRepository,
            PaymentIntentRepository paymentIntentRepository,
            PaymentRepository paymentRepository,
            OutboxEventRepository outboxEventRepository,
            StoreFulfillmentRepository storeFulfillmentRepository
    ) {
        this.storeRepository = storeRepository;
        this.storeOrderRepository = storeOrderRepository;
        this.paymentIntentRepository = paymentIntentRepository;
        this.paymentRepository = paymentRepository;
        this.outboxEventRepository = outboxEventRepository;
        this.storeFulfillmentRepository = storeFulfillmentRepository;
    }

    public OrderView getOrder(UUID orderId) {
        OrderData orderData = loadOrderData(orderId);
        return new OrderView(
                orderData.order().getId(),
                orderData.order().getStatus(),
                orderData.order().getCreatedAt(),
                orderData.order().getCurrency(),
                orderData.order().getSubtotalAmount(),
                orderData.order().getOriginalAmount(),
                orderData.order().getDiscountAmount(),
                orderData.order().getAppliedCouponCode(),
                orderData.order().getShippingCostAmount(),
                orderData.order().getTotalAmount(),
                orderData.itemViews(),
                orderData.shipping(),
                orderData.payment(),
                orderData.fulfillment(),
                orderData.operationalIssue()
        );
    }

    public AdminOrderView getAdminOrder(UUID orderId) {
        OrderData orderData = loadOrderData(orderId);
        List<TimelineEventView> timeline = buildTimeline(orderData.order(), orderData.payment());
        AdminOrderOperationalSummary operationalSummary = buildOperationalSummary(
                orderData.order(),
                orderData.payment(),
                orderData.operationalIssue(),
                timeline.stream().anyMatch(event -> "FULFILLMENT_CREATED".equals(event.code())),
                timeline.stream().anyMatch(event -> "MANUAL_CANCELLATION".equals(event.code()))
        );

        return new AdminOrderView(
                orderData.order().getId(),
                orderData.order().getStatus(),
                orderData.order().getCreatedAt(),
                orderData.order().getCurrency(),
                orderData.order().getSubtotalAmount(),
                orderData.order().getShippingCostAmount(),
                orderData.order().getTotalAmount(),
                orderData.itemViews(),
                orderData.shipping(),
                orderData.payment(),
                orderData.operationalIssue(),
                operationalSummary,
                timeline
        );
    }

    private OrderData loadOrderData(UUID orderId) {
        UUID storeId = resolveStoreId();

        StoreOrder order = storeOrderRepository.findWithItemsByStoreIdAndId(storeId, orderId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "store_order_not_found"));

        PaymentView payment = paymentRepository.findFirstByScopeAndOperationIdAndStatus(
                        PaymentScope.STORE,
                        orderId,
                        PaymentStatus.CONFIRMED
                )
                .map(p -> new PaymentView(p.getStatus(), p.getProvider(), p.getProviderPaymentId(), p.getConfirmedAt()))
                .orElse(null);

        ShippingView shipping = null;
        if (order.getShippingZoneId() != null || (order.getShippingPostalCode() != null && !order.getShippingPostalCode().isBlank())) {
            shipping = new ShippingView(order.getShippingZoneId(), order.getShippingPostalCode());
        }

        List<OrderItemView> itemViews = order.getItems().stream()
                .map(this::toItemView)
                .toList();

        FulfillmentView fulfillment = storeFulfillmentRepository.findByStoreOrderId(order.getId())
                .map(record -> new FulfillmentView(
                        record.getId(),
                        record.getStatus().name(),
                        record.getMethod(),
                        record.getCreatedAt()
                ))
                .orElse(null);

        OperationalIssueView operationalIssue = resolveOperationalIssue(order, payment);
        return new OrderData(order, itemViews, shipping, payment, fulfillment, operationalIssue);
    }

    public PageResult<OrderSummaryView> listOrders(StoreOrderStatus status, int page, int size, String sort) {
        UUID storeId = resolveStoreId();
        PageRequest pageRequest = PageRequest.of(page, size, parseSort(sort));
        Page<StoreOrder> result = status == null
                ? storeOrderRepository.findByStoreId(storeId, pageRequest)
                : storeOrderRepository.findByStoreIdAndStatus(storeId, status, pageRequest);

        Set<UUID> orderIds = result.getContent().stream().map(StoreOrder::getId).collect(java.util.stream.Collectors.toSet());
        Set<UUID> conflictedOrderIds = orderIds.isEmpty()
                ? Set.of()
                : outboxEventRepository.findAggregateIdsByEventTypeAndAggregateIdIn(STOCK_CONFLICT_EVENT_TYPE, orderIds);

        List<OrderSummaryView> content = result.getContent().stream()
                .map(o -> new OrderSummaryView(
                        o.getId(),
                        o.getStatus(),
                        o.getCreatedAt(),
                        o.getTotalAmount(),
                        o.getCurrency(),
                        o.getStatus() == StoreOrderStatus.PENDING_PAYMENT && conflictedOrderIds.contains(o.getId()) ? stockConflictIssueSummary() : null
                ))
                .toList();

        return new PageResult<>(
                result.getTotalElements(),
                result.getTotalPages(),
                result.getNumber(),
                result.getSize(),
                content
        );
    }

    public PageResult<AdminOrderSummaryView> listAdminOrders(
            StoreOrderStatus status,
            Instant createdFrom,
            Instant createdTo,
            Instant paidFrom,
            Instant paidTo,
            Boolean hasOperationalConflict,
            Boolean manuallyCancelled,
            Instant manualCancelledFrom,
            Instant manualCancelledTo,
            Boolean hasConflictEvent,
            Instant conflictFrom,
            Instant conflictTo,
            Boolean hasFulfillment,
            int page,
            int size,
            String sort
    ) {
        UUID storeId = resolveStoreId();
        PageRequest pageRequest = PageRequest.of(page, size, parseSort(sort));
        boolean applyCreatedFrom = createdFrom != null;
        boolean applyCreatedTo = createdTo != null;
        boolean applyPaidFrom = paidFrom != null;
        boolean applyPaidTo = paidTo != null;
        boolean applyPaidWindow = applyPaidFrom || applyPaidTo;
        boolean applyManualCancelledFrom = manualCancelledFrom != null;
        boolean applyManualCancelledTo = manualCancelledTo != null;
        boolean applyConflictFrom = conflictFrom != null;
        boolean applyConflictTo = conflictTo != null;
        Page<StoreOrder> result = storeOrderRepository.findAdminOrders(
                storeId,
                status,
                applyCreatedFrom,
                createdFrom == null ? MIN_FILTER_INSTANT : createdFrom,
                applyCreatedTo,
                createdTo == null ? MAX_FILTER_INSTANT : createdTo,
                applyPaidWindow,
                applyPaidFrom,
                paidFrom == null ? MIN_FILTER_INSTANT : paidFrom,
                applyPaidTo,
                paidTo == null ? MAX_FILTER_INSTANT : paidTo,
                hasOperationalConflict,
                manuallyCancelled,
                applyManualCancelledFrom,
                manualCancelledFrom == null ? MIN_FILTER_INSTANT : manualCancelledFrom,
                applyManualCancelledTo,
                manualCancelledTo == null ? MAX_FILTER_INSTANT : manualCancelledTo,
                hasConflictEvent,
                applyConflictFrom,
                conflictFrom == null ? MIN_FILTER_INSTANT : conflictFrom,
                applyConflictTo,
                conflictTo == null ? MAX_FILTER_INSTANT : conflictTo,
                hasFulfillment,
                PaymentScope.STORE,
                PaymentStatus.CONFIRMED,
                StoreOrderStatus.PENDING_PAYMENT,
                ORDER_MANUALLY_CANCELLED_EVENT_TYPE,
                STOCK_CONFLICT_EVENT_TYPE,
                pageRequest
        );

        Set<UUID> orderIds = result.getContent().stream()
                .map(StoreOrder::getId)
                .collect(java.util.stream.Collectors.toSet());
        Set<UUID> conflictedOrderIds = orderIds.isEmpty()
                ? Set.of()
                : outboxEventRepository.findAggregateIdsByEventTypeAndAggregateIdIn(STOCK_CONFLICT_EVENT_TYPE, orderIds);
        Set<UUID> fulfillmentOrderIds = orderIds.isEmpty()
                ? Set.of()
                : storeFulfillmentRepository.findStoreOrderIdsByStoreOrderIdIn(orderIds);
        Set<UUID> paymentConfirmedOrderIds = orderIds.isEmpty()
                ? Set.of()
                : paymentRepository.findOperationIdsByScopeAndStatusAndOperationIdIn(
                        PaymentScope.STORE,
                        PaymentStatus.CONFIRMED,
                        orderIds
                );
        Set<UUID> manuallyCancelledOrderIds = result.getContent().stream()
                .filter(order -> order.getStatus() == StoreOrderStatus.CANCELLED)
                .map(StoreOrder::getId)
                .filter(orderId -> outboxEventRepository.existsByAggregateIdAndEventType(orderId, "STORE_ORDER_MANUALLY_CANCELLED"))
                .collect(java.util.stream.Collectors.toSet());

        List<AdminOrderSummaryView> content = result.getContent().stream()
                .map(order -> {
                    boolean operationalConflict = conflictedOrderIds.contains(order.getId()) && order.getStatus() == StoreOrderStatus.PENDING_PAYMENT;
                    boolean fulfillmentCreated = fulfillmentOrderIds.contains(order.getId());
                    boolean paymentConfirmed = paymentConfirmedOrderIds.contains(order.getId());
                    boolean manuallyCancelledFlag = manuallyCancelledOrderIds.contains(order.getId());
                    boolean canCancel = order.getStatus() != StoreOrderStatus.CANCELLED && !fulfillmentCreated;
                    boolean canRetryProcessing = order.getStatus() == StoreOrderStatus.PENDING_PAYMENT
                            && operationalConflict
                            && paymentConfirmed
                            && !fulfillmentCreated;

                    return new AdminOrderSummaryView(
                            order.getId(),
                            order.getStatus(),
                            order.getCreatedAt(),
                            order.getTotalAmount(),
                            order.getCurrency(),
                            operationalConflict ? stockConflictIssueSummary() : null,
                            fulfillmentCreated,
                            paymentConfirmed,
                            manuallyCancelledFlag,
                            canCancel,
                            canRetryProcessing
                    );
                })
                .toList();

        return new PageResult<>(
                result.getTotalElements(),
                result.getTotalPages(),
                result.getNumber(),
                result.getSize(),
                content
        );
    }

    private UUID resolveStoreId() {
        String storeSlug = TenantContext.getStoreSlug();
        if (storeSlug == null || storeSlug.isBlank()) {
            throw new ResponseStatusException(BAD_REQUEST, "store_context_required");
        }

        Store store = storeRepository.findBySlug(storeSlug)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "store_not_found"));

        if (!store.isActive()) {
            throw new ResponseStatusException(NOT_FOUND, "store_not_found");
        }

        return store.getId();
    }

    private Sort parseSort(String sort) {
        if (sort == null || sort.isBlank()) {
            return Sort.by(Sort.Order.desc("createdAt"));
        }
        String[] parts = sort.split(",", 2);
        String field = parts[0].trim();
        if (!ALLOWED_SORT_FIELDS.contains(field)) {
            return Sort.by(Sort.Order.desc("createdAt"));
        }
        String dir = parts.length > 1 ? parts[1].trim() : "desc";
        Sort.Direction direction = "asc".equalsIgnoreCase(dir) ? Sort.Direction.ASC : Sort.Direction.DESC;
        return Sort.by(new Sort.Order(direction, field));
    }

    private OrderItemView toItemView(StoreOrderItem item) {
        Map<String, Object> snapshot = readSnapshot(item.getItemSnapshotJson());
        String name = snapshot.get("name") == null ? null : snapshot.get("name").toString();

        return new OrderItemView(
                item.getProductId(),
                name,
                item.getQty(),
                item.getUnitPriceAmount(),
                item.getLineTotalAmount(),
                item.getCurrency()
        );
    }

    private Map<String, Object> readSnapshot(String json) {
        try {
            return MAPPER.readValue(json, new TypeReference<>() {});
        } catch (Exception e) {
            throw new RuntimeException("invalid_item_snapshot", e);
        }
    }

    private OperationalIssueView resolveOperationalIssue(StoreOrder order, PaymentView payment) {
        if (order.getStatus() != StoreOrderStatus.PENDING_PAYMENT || payment == null) {
            return null;
        }

        Optional<OutboxEvent> stockConflictEvent = outboxEventRepository.findFirstByAggregateIdAndEventTypeOrderByOccurredAtDesc(
                order.getId(),
                STOCK_CONFLICT_EVENT_TYPE
        );
        if (stockConflictEvent.isEmpty()) {
            return null;
        }

        Map<String, Object> payload = readSnapshot(stockConflictEvent.get().getPayloadJson());
        List<OperationalIssueItemView> items = List.of();
        Object conflictsRaw = payload.get("conflicts");
        if (conflictsRaw instanceof List<?> conflicts) {
            items = conflicts.stream()
                    .filter(Map.class::isInstance)
                    .map(Map.class::cast)
                    .map(conflict -> new OperationalIssueItemView(
                            parseUuid(conflict.get("productId")),
                            asString(conflict.get("sku")),
                            asLong(conflict.get("availableQuantity")),
                            asLong(conflict.get("requestedQuantity"))
                    ))
                    .toList();
        }

        return new OperationalIssueView(
                "STOCK_CONFLICT",
                "Conflicto de stock post-pago",
                "El pago fue confirmado, pero no se pudo completar la orden porque el stock ya no alcanzaba al momento del procesamiento.",
                stockConflictEvent.get().getOccurredAt(),
                items
        );
    }

    private OperationalIssueView stockConflictIssueSummary() {
        return new OperationalIssueView(
                "STOCK_CONFLICT",
                "Conflicto de stock post-pago",
                "Pago confirmado con conflicto operativo de stock pendiente de revisión.",
                null,
                List.of()
        );
    }

    private UUID parseUuid(Object value) {
        return value == null ? null : UUID.fromString(value.toString());
    }

    private String asString(Object value) {
        return value == null ? null : value.toString();
    }

    private long asLong(Object value) {
        if (value == null) return 0L;
        if (value instanceof Number number) return number.longValue();
        return Long.parseLong(value.toString());
    }

    private List<TimelineEventView> buildTimeline(StoreOrder order, PaymentView payment) {
        List<TimelineEventView> timeline = new ArrayList<>();
        timeline.add(new TimelineEventView(
                "ORDER_CREATED",
                "Orden creada",
                "La orden STORE quedó registrada en backend.",
                order.getCreatedAt()
        ));

        List<PaymentIntent> paymentIntents = paymentIntentRepository.findByScopeAndStoreOrderIdOrderByCreatedAtAsc(
                PaymentScope.STORE,
                order.getId()
        );
        if (!paymentIntents.isEmpty()) {
            PaymentIntent firstIntent = paymentIntents.get(0);
            timeline.add(new TimelineEventView(
                    "PAYMENT_INITIATED",
                    "Pago iniciado",
                    "Se abrió una intención de pago para la orden.",
                    firstIntent.getCreatedAt()
            ));
        }

        if (payment != null) {
            timeline.add(new TimelineEventView(
                    "PAYMENT_CONFIRMED",
                    "Pago confirmado",
                    "El proveedor confirmó el pago.",
                    payment.confirmedAt()
            ));
        }

        for (OutboxEvent event : outboxEventRepository.findByAggregateIdOrderByOccurredAtAsc(order.getId())) {
            TimelineEventView timelineEvent = mapTimelineEvent(event);
            if (timelineEvent != null) {
                timeline.add(timelineEvent);
            }
        }

        storeFulfillmentRepository.findByStoreOrderId(order.getId())
                .ifPresent(fulfillment -> timeline.add(new TimelineEventView(
                        "FULFILLMENT_CREATED",
                        "Fulfillment creado",
                        "Se creó el fulfillment operativo para esta orden.",
                        fulfillment.getCreatedAt()
                )));

        return timeline.stream()
                .sorted(Comparator.comparing(TimelineEventView::occurredAt))
                .toList();
    }

    private TimelineEventView mapTimelineEvent(OutboxEvent event) {
        return switch (event.getEventType()) {
            case STOCK_CONFLICT_EVENT_TYPE -> new TimelineEventView(
                    "STOCK_CONFLICT",
                    "Conflicto de stock",
                    "El pago ya estaba confirmado, pero no había stock suficiente para completar la orden.",
                    event.getOccurredAt()
            );
            case "STORE_ORDER_PAID" -> new TimelineEventView(
                    "ORDER_PAID",
                    "Orden marcada como pagada",
                    "La orden terminó su procesamiento y quedó operativamente pagada.",
                    event.getOccurredAt()
            );
            case "STORE_ORDER_MANUALLY_CANCELLED" -> new TimelineEventView(
                    "MANUAL_CANCELLATION",
                    "Cancelación manual",
                    "Un admin canceló manualmente la orden.",
                    event.getOccurredAt()
            );
            default -> null;
        };
    }

    private AdminOrderOperationalSummary buildOperationalSummary(
            StoreOrder order,
            PaymentView payment,
            OperationalIssueView operationalIssue,
            boolean hasFulfillment,
            boolean manuallyCancelled
    ) {
        boolean paymentConfirmed = payment != null;
        boolean hasConflict = operationalIssue != null;
        boolean canCancel = order.getStatus() != StoreOrderStatus.CANCELLED && !hasFulfillment;
        boolean canRetryProcessing = order.getStatus() == StoreOrderStatus.PENDING_PAYMENT
                && hasConflict
                && paymentConfirmed
                && !hasFulfillment
                && !manuallyCancelled;

        return new AdminOrderOperationalSummary(
                order.getStatus(),
                paymentConfirmed,
                hasConflict,
                hasFulfillment,
                manuallyCancelled,
                canCancel,
                canRetryProcessing
        );
    }

    public record OrderView(
            UUID orderId,
            StoreOrderStatus status,
            Instant createdAt,
            String currency,
            BigDecimal subtotalAmount,
            BigDecimal originalAmount,
            BigDecimal discountAmount,
            String appliedCouponCode,
            BigDecimal shippingCostAmount,
            BigDecimal totalAmount,
            List<OrderItemView> items,
            ShippingView shipping,
            PaymentView payment,
            FulfillmentView fulfillment,
            OperationalIssueView operationalIssue
    ) {}

    public record AdminOrderView(
            UUID orderId,
            StoreOrderStatus status,
            Instant createdAt,
            String currency,
            BigDecimal subtotalAmount,
            BigDecimal shippingCostAmount,
            BigDecimal totalAmount,
            List<OrderItemView> items,
            ShippingView shipping,
            PaymentView payment,
            OperationalIssueView operationalIssue,
            AdminOrderOperationalSummary operationalSummary,
            List<TimelineEventView> timeline
    ) {}

    public record AdminOrderSummaryView(
            UUID orderId,
            StoreOrderStatus status,
            Instant createdAt,
            BigDecimal totalAmount,
            String currency,
            OperationalIssueView operationalIssue,
            boolean hasFulfillment,
            boolean paymentConfirmed,
            boolean manuallyCancelled,
            boolean canCancel,
            boolean canRetryProcessing
    ) {}

    public record OrderItemView(
            UUID productId,
            String name,
            int qty,
            BigDecimal unitPriceAmount,
            BigDecimal lineTotalAmount,
            String currency
    ) {}

    public record ShippingView(UUID zoneId, String postalCode) {}

    public record FulfillmentView(
            UUID fulfillmentId,
            String status,
            String method,
            Instant createdAt
    ) {}

    public record PaymentView(
            PaymentStatus status,
            String provider,
            String providerPaymentId,
            Instant confirmedAt
    ) {}

    public record TimelineEventView(
            String code,
            String title,
            String description,
            Instant occurredAt
    ) {}

    public record AdminOrderOperationalSummary(
            StoreOrderStatus status,
            boolean paymentConfirmed,
            boolean hasOperationalConflict,
            boolean hasFulfillment,
            boolean manuallyCancelled,
            boolean canCancel,
            boolean canRetryProcessing
    ) {}

    private record OrderData(
            StoreOrder order,
            List<OrderItemView> itemViews,
            ShippingView shipping,
            PaymentView payment,
            FulfillmentView fulfillment,
            OperationalIssueView operationalIssue
    ) {}

    public record OrderSummaryView(
            UUID orderId,
            StoreOrderStatus status,
            Instant createdAt,
            BigDecimal totalAmount,
            String currency,
            OperationalIssueView operationalIssue
    ) {}

    public record OperationalIssueView(
            String code,
            String title,
            String message,
            Instant detectedAt,
            List<OperationalIssueItemView> items
    ) {}

    public record OperationalIssueItemView(
            UUID productId,
            String sku,
            long availableQuantity,
            long requestedQuantity
    ) {}

    public record PageResult<T>(
            long totalElements,
            int totalPages,
            int page,
            int size,
            List<T> content
    ) {}
}
