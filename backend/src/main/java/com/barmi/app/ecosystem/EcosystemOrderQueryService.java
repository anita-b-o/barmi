package com.barmi.app.ecosystem;

import com.barmi.domain.enums.PaymentScope;
import com.barmi.domain.orders.EcosystemOrder;
import com.barmi.domain.orders.EcosystemOrderItem;
import com.barmi.domain.orders.EcosystemOrderStatus;
import com.barmi.domain.payments.Payment;
import com.barmi.domain.payments.PaymentStatus;
import com.barmi.infra.repo.EcosystemOrderRepository;
import com.barmi.infra.repo.PaymentRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static org.springframework.http.HttpStatus.NOT_FOUND;

@Service
public class EcosystemOrderQueryService {
    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final Set<String> ALLOWED_SORT_FIELDS = Set.of("createdAt");

    private final EcosystemOrderRepository ecosystemOrderRepository;
    private final PaymentRepository paymentRepository;

    public EcosystemOrderQueryService(
            EcosystemOrderRepository ecosystemOrderRepository,
            PaymentRepository paymentRepository
    ) {
        this.ecosystemOrderRepository = ecosystemOrderRepository;
        this.paymentRepository = paymentRepository;
    }

    public OrderView getOrder(UUID orderId) {
        EcosystemOrder order = ecosystemOrderRepository.findWithItemsById(orderId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "ecosystem_order_not_found"));

        PaymentView payment = paymentRepository.findFirstByScopeAndOperationIdAndStatus(
                        PaymentScope.ECOSYSTEM,
                        orderId,
                        PaymentStatus.CONFIRMED
                )
                .map(p -> new PaymentView(p.getStatus(), p.getProvider(), p.getProviderPaymentId(), p.getConfirmedAt()))
                .orElse(null);

        List<OrderItemView> items = order.getItems().stream()
                .map(this::toItemView)
                .toList();

        ShippingView shipping = null;
        if (order.getShippingZoneId() != null || (order.getShippingPostalCode() != null && !order.getShippingPostalCode().isBlank())) {
            shipping = new ShippingView(order.getShippingZoneId(), order.getShippingPostalCode());
        }

        return new OrderView(
                order.getId(),
                order.getStatus(),
                order.getCreatedAt(),
                order.getCurrency(),
                order.getSubtotalAmount(),
                order.getShippingCostAmount(),
                order.getTotalAmount(),
                items,
                shipping,
                payment
        );
    }

    public PageResult<OrderSummaryView> listOrders(
            UUID ecosystemId,
            EcosystemOrderStatus status,
            int page,
            int size,
            String sort,
            Instant createdFrom,
            Instant createdTo,
            Instant paidFrom,
            Instant paidTo
    ) {
        PageRequest pageRequest = PageRequest.of(page, size, parseSort(sort));
        boolean applyPaidFilter = paidFrom != null || paidTo != null;
        boolean applyCreatedFrom = createdFrom != null;
        boolean applyCreatedTo = createdTo != null;
        Instant createdFromInclusive = createdFrom == null ? Instant.EPOCH : createdFrom;
        Instant createdToExclusive = createdTo == null ? Instant.parse("9999-12-31T00:00:00Z") : createdTo;
        Instant paidFromInclusive = paidFrom == null ? Instant.EPOCH : paidFrom;
        Instant paidToExclusive = paidTo == null ? Instant.parse("9999-12-31T00:00:00Z") : paidTo;
        Set<UUID> paidOrderIds = applyPaidFilter
                ? paymentRepository.findConfirmedEcosystemOperationIdsInRange(
                        PaymentScope.ECOSYSTEM,
                        PaymentStatus.CONFIRMED,
                        ecosystemId,
                        paidFromInclusive,
                        paidToExclusive
                )
                : Collections.singleton(UUID.randomUUID());

        if (applyPaidFilter && paidOrderIds.isEmpty()) {
            return new PageResult<>(0, 0, page, size, List.of());
        }

        Page<EcosystemOrder> result = ecosystemOrderRepository.searchForAdmin(
                ecosystemId,
                status,
                applyCreatedFrom,
                createdFromInclusive,
                applyCreatedTo,
                createdToExclusive,
                applyPaidFilter,
                paidOrderIds,
                pageRequest
        );

        List<OrderSummaryView> content = result.getContent().stream()
                .map(o -> new OrderSummaryView(
                        o.getId(),
                        o.getStatus(),
                        o.getCreatedAt(),
                        paymentRepository.findFirstByScopeAndOperationIdAndStatus(
                                        PaymentScope.ECOSYSTEM,
                                        o.getId(),
                                        PaymentStatus.CONFIRMED
                                )
                                .map(Payment::getConfirmedAt)
                                .orElse(null),
                        o.getTotalAmount(),
                        o.getCurrency()
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

    private OrderItemView toItemView(EcosystemOrderItem item) {
        Map<String, Object> snapshot = readSnapshot(item.getItemSnapshotJson());
        UUID productId = item.getExternalProductId();
        String name = snapshot.get("name") == null ? null : snapshot.get("name").toString();
        String currency = snapshot.get("currency") == null ? null : snapshot.get("currency").toString();

        return new OrderItemView(
                productId,
                name,
                item.getQty(),
                item.getUnitPriceAmount(),
                item.getLineTotalAmount(),
                currency
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
            EcosystemOrderStatus status,
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
            EcosystemOrderStatus status,
            Instant createdAt,
            Instant paidAt,
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
