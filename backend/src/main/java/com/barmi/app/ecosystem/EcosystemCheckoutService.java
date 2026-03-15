package com.barmi.app.ecosystem;

import com.barmi.domain.ecosystem.Ecosystem;
import com.barmi.domain.ecosystem.EcosystemExternalProduct;
import com.barmi.domain.events.OutboxEvent;
import com.barmi.domain.orders.EcosystemOrder;
import com.barmi.domain.orders.EcosystemOrderItem;
import com.barmi.domain.shipping.EcosystemShippingZone;
import com.barmi.infra.repo.EcosystemExternalProductRepository;
import com.barmi.infra.repo.EcosystemOrderRepository;
import com.barmi.infra.repo.EcosystemRepository;
import com.barmi.infra.repo.OutboxEventRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class EcosystemCheckoutService {
    private static final String EVENT_TYPE = "ECOSYSTEM_ORDER_CREATED";
    private static final ObjectMapper MAPPER = new ObjectMapper();

    private final EcosystemRepository ecosystemRepository;
    private final EcosystemExternalProductRepository ecosystemExternalProductRepository;
    private final EcosystemOrderRepository ecosystemOrderRepository;
    private final OutboxEventRepository outboxEventRepository;
    private final EcosystemShippingResolver ecosystemShippingResolver;

    public EcosystemCheckoutService(
            EcosystemRepository ecosystemRepository,
            EcosystemExternalProductRepository ecosystemExternalProductRepository,
            EcosystemOrderRepository ecosystemOrderRepository,
            OutboxEventRepository outboxEventRepository,
            EcosystemShippingResolver ecosystemShippingResolver
    ) {
        this.ecosystemRepository = ecosystemRepository;
        this.ecosystemExternalProductRepository = ecosystemExternalProductRepository;
        this.ecosystemOrderRepository = ecosystemOrderRepository;
        this.outboxEventRepository = outboxEventRepository;
        this.ecosystemShippingResolver = ecosystemShippingResolver;
    }

    public record CheckoutItem(UUID externalProductId, int qty) {}
    public record ShippingRequest(String postalCode) {}

    @Transactional
    public EcosystemOrder checkout(
            UUID ecosystemId,
            List<CheckoutItem> items,
            ShippingRequest shipping
    ) {
        if (ecosystemId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "missing_ecosystem_id");
        }
        if (items == null || items.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "missing_items");
        }

        for (CheckoutItem item : items) {
            if (item == null || item.externalProductId() == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "missing_items");
            }
            if (item.qty() < 1) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid_quantity");
            }
        }

        Ecosystem ecosystem = ecosystemRepository.findById(ecosystemId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "ecosystem_not_found"));

        if (!ecosystem.isActive()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "ecosystem_inactive");
        }

        Map<UUID, Integer> qtyByProductId = new HashMap<>();
        for (CheckoutItem item : items) {
            qtyByProductId.merge(item.externalProductId(), item.qty(), Integer::sum);
        }

        List<UUID> requestedIds = qtyByProductId.keySet().stream().toList();

        List<EcosystemExternalProduct> products = ecosystemExternalProductRepository.findAllById(requestedIds);
        if (products.size() != requestedIds.size()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "external_product_not_found");
        }

        Map<UUID, EcosystemExternalProduct> productById = products.stream()
                .collect(Collectors.toMap(EcosystemExternalProduct::getId, p -> p));

        for (UUID productId : requestedIds) {
            EcosystemExternalProduct product = productById.get(productId);
            if (product == null) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "external_product_not_found");
            }
            if (!product.getEcosystem().getId().equals(ecosystem.getId())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "external_product_wrong_ecosystem");
            }
            if (!product.isActive()) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "external_product_not_found");
            }
        }

        String currency = products.get(0).getCurrency();
        for (EcosystemExternalProduct product : products) {
            if (!currency.equals(product.getCurrency())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "currency_mismatch");
            }
        }

        UUID orderId = UUID.randomUUID();
        List<EcosystemOrderItem> orderItems = new ArrayList<>();
        BigDecimal subtotal = BigDecimal.ZERO;
        boolean allDeliverySupported = true;

        for (Map.Entry<UUID, Integer> entry : qtyByProductId.entrySet()) {
            EcosystemExternalProduct product = productById.get(entry.getKey());
            int qty = entry.getValue();
            BigDecimal unitPrice = product.getPriceAmount().setScale(2, RoundingMode.HALF_UP);
            BigDecimal lineTotal = unitPrice.multiply(BigDecimal.valueOf(qty)).setScale(2, RoundingMode.HALF_UP);
            if (!product.isDeliverySupported()) {
                allDeliverySupported = false;
            }

            String snapshotJson = toJson(Map.of(
                    "externalProductId", product.getId(),
                    "name", product.getName(),
                    "priceAmount", unitPrice,
                    "currency", product.getCurrency(),
                    "deliverySupported", product.isDeliverySupported()
            ));

            EcosystemOrderItem orderItem = new EcosystemOrderItem(
                    UUID.randomUUID(),
                    product.getId(),
                    qty,
                    unitPrice,
                    lineTotal,
                    snapshotJson
            );

            orderItems.add(orderItem);
            subtotal = subtotal.add(lineTotal);
        }
        subtotal = subtotal.setScale(2, RoundingMode.HALF_UP);

        if (subtotal.compareTo(BigDecimal.ZERO) <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid_subtotal");
        }

        EcosystemShippingZone shippingZone = null;
        BigDecimal shippingCost = BigDecimal.ZERO;
        String shippingCurrency = "";
        String shippingPostalCode = null;
        UUID shippingZoneId = null;
        if (shipping != null) {
            if (shipping.postalCode() == null || shipping.postalCode().isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "missing_postal_code");
            }
            if (!allDeliverySupported) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "shipping_not_supported");
            }
            String normalizedPostalCode = shipping.postalCode().trim();
            shippingZone = resolveShippingRequired(ecosystem.getId(), normalizedPostalCode);
            shippingCost = shippingZone.getCostAmount().setScale(2, RoundingMode.HALF_UP);
            shippingCurrency = shippingZone.getCurrency();
            shippingPostalCode = normalizedPostalCode;
            shippingZoneId = shippingZone.getId();
            if (!currency.equals(shippingCurrency)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "shipping_currency_mismatch");
            }
        }

        shippingCost = shippingCost.setScale(2, RoundingMode.HALF_UP);
        subtotal = subtotal.setScale(2, RoundingMode.HALF_UP);
        if (shippingCost.compareTo(BigDecimal.ZERO) <= 0) {
            shippingCurrency = "";
        }

        BigDecimal total = subtotal.add(shippingCost).setScale(2, RoundingMode.HALF_UP);
        if (total.compareTo(subtotal.add(shippingCost)) != 0) {
            throw new IllegalStateException("total_calculation_error");
        }

        EcosystemOrder order = EcosystemOrder.create(
                orderId,
                ecosystem,
                currency,
                subtotal,
                shippingCost,
                shippingCurrency,
                shippingZoneId,
                shippingPostalCode,
                total,
                orderItems
        );

        ecosystemOrderRepository.save(order);

        // Outbox write is in same transaction as order persist to ensure atomic publish
        Map<String, Object> payload = Map.of(
                "ecosystemOrderId", orderId,
                "ecosystemId", ecosystem.getId(),
                "subtotalAmount", subtotal,
                "shippingCostAmount", shippingCost,
                "totalAmount", total,
                "currency", currency
        );

        OutboxEvent event = new OutboxEvent(
                UUID.randomUUID(),
                EVENT_TYPE,
                "ECOSYSTEM",
                orderId,
                toJson(payload)
        );
        outboxEventRepository.save(event);

        return order;
    }

    private EcosystemShippingZone resolveShippingRequired(UUID ecosystemId, String postalCode) {
        return ecosystemShippingResolver.resolve(ecosystemId, postalCode)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "shipping_not_available"));
    }

    private static String toJson(Object value) {
        try {
            return MAPPER.writeValueAsString(value);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("json_encode_failed", e);
        }
    }
}
