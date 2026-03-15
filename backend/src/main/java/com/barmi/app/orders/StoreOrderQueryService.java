package com.barmi.app.orders;

import com.barmi.app.tenant.TenantContext;
import com.barmi.domain.enums.PaymentScope;
import com.barmi.domain.orders.StoreOrder;
import com.barmi.domain.orders.StoreOrderItem;
import com.barmi.domain.orders.StoreOrderStatus;
import com.barmi.domain.payments.PaymentStatus;
import com.barmi.domain.store.Store;
import com.barmi.infra.repo.PaymentRepository;
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
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.NOT_FOUND;

@Service
public class StoreOrderQueryService {
    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final Set<String> ALLOWED_SORT_FIELDS = Set.of("createdAt");

    private final StoreRepository storeRepository;
    private final StoreOrderRepository storeOrderRepository;
    private final PaymentRepository paymentRepository;

    public StoreOrderQueryService(
            StoreRepository storeRepository,
            StoreOrderRepository storeOrderRepository,
            PaymentRepository paymentRepository
    ) {
        this.storeRepository = storeRepository;
        this.storeOrderRepository = storeOrderRepository;
        this.paymentRepository = paymentRepository;
    }

    public OrderView getOrder(UUID orderId) {
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

        return new OrderView(
                order.getId(),
                order.getStatus(),
                order.getCreatedAt(),
                order.getCurrency(),
                order.getSubtotalAmount(),
                order.getShippingCostAmount(),
                order.getTotalAmount(),
                itemViews,
                shipping,
                payment
        );
    }

    public PageResult<OrderSummaryView> listOrders(StoreOrderStatus status, int page, int size, String sort) {
        UUID storeId = resolveStoreId();
        PageRequest pageRequest = PageRequest.of(page, size, parseSort(sort));
        Page<StoreOrder> result = status == null
                ? storeOrderRepository.findByStoreId(storeId, pageRequest)
                : storeOrderRepository.findByStoreIdAndStatus(storeId, status, pageRequest);

        List<OrderSummaryView> content = result.getContent().stream()
                .map(o -> new OrderSummaryView(o.getId(), o.getStatus(), o.getCreatedAt(), o.getTotalAmount(), o.getCurrency()))
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

    public record OrderView(
            UUID orderId,
            StoreOrderStatus status,
            Instant createdAt,
            String currency,
            BigDecimal subtotalAmount,
            BigDecimal shippingCostAmount,
            BigDecimal totalAmount,
            List<OrderItemView> items,
            ShippingView shipping,
            PaymentView payment
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

    public record PaymentView(
            PaymentStatus status,
            String provider,
            String providerPaymentId,
            Instant confirmedAt
    ) {}

    public record OrderSummaryView(
            UUID orderId,
            StoreOrderStatus status,
            Instant createdAt,
            BigDecimal totalAmount,
            String currency
    ) {}

    public record PageResult<T>(
            long totalElements,
            int totalPages,
            int page,
            int size,
            List<T> content
    ) {}
}
