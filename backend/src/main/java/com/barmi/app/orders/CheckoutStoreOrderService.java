package com.barmi.app.orders;

import com.barmi.app.tenant.TenantContext;
import com.barmi.app.shipping.StoreShippingQuoteService;
import com.barmi.domain.catalog.Product;
import com.barmi.domain.enums.PaymentScope;
import com.barmi.domain.shipping.StoreShippingZone;
import com.barmi.domain.events.OutboxEvent;
import com.barmi.domain.orders.StoreOrder;
import com.barmi.domain.orders.StoreOrderItem;
import com.barmi.domain.store.Store;
import com.barmi.infra.repo.OutboxEventRepository;
import com.barmi.infra.repo.ProductRepository;
import com.barmi.infra.repo.StoreOrderItemRepository;
import com.barmi.infra.repo.StoreOrderRepository;
import com.barmi.infra.repo.StoreRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class CheckoutStoreOrderService {
    private static final String EVENT_TYPE = "STORE_ORDER_CREATED";
    private static final ObjectMapper MAPPER = new ObjectMapper();

    private final String defaultCurrency;
    private final StoreRepository storeRepository;
    private final ProductRepository productRepository;
    private final StoreOrderRepository storeOrderRepository;
    private final StoreOrderItemRepository storeOrderItemRepository;
    private final OutboxEventRepository outboxEventRepository;
    private final StoreShippingQuoteService storeShippingQuoteService;

    public CheckoutStoreOrderService(
            @Value("${app.money.defaultCurrency}") String defaultCurrency,
            StoreRepository storeRepository,
            ProductRepository productRepository,
            StoreOrderRepository storeOrderRepository,
            StoreOrderItemRepository storeOrderItemRepository,
            OutboxEventRepository outboxEventRepository,
            StoreShippingQuoteService storeShippingQuoteService
    ) {
        this.defaultCurrency = defaultCurrency;
        this.storeRepository = storeRepository;
        this.productRepository = productRepository;
        this.storeOrderRepository = storeOrderRepository;
        this.storeOrderItemRepository = storeOrderItemRepository;
        this.outboxEventRepository = outboxEventRepository;
        this.storeShippingQuoteService = storeShippingQuoteService;
    }

    public record CheckoutItem(UUID productId, int qty) {}
    public record ShippingRequest(String postalCode) {}

    @Transactional
    public StoreOrder checkout(List<CheckoutItem> items, ShippingRequest shipping) {
        if (items == null || items.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "items_required");
        }

        for (CheckoutItem item : items) {
            if (item == null || item.productId() == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid_item");
            }
            if (item.qty() < 1) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "qty_must_be_positive");
            }
        }

        String storeSlug = TenantContext.getStoreSlug();
        if (storeSlug == null || storeSlug.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "store_context_required");
        }

        Store store = storeRepository.findBySlug(storeSlug)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "store_not_found"));

        if (!store.isActive()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "store_inactive");
        }

        List<UUID> requestedIds = items.stream()
                .map(CheckoutItem::productId)
                .distinct()
                .toList();

        List<Product> products = productRepository.findAllById(requestedIds);
        if (products.size() != requestedIds.size()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "product_not_found");
        }

        Map<UUID, Product> productById = products.stream()
                .collect(Collectors.toMap(Product::getId, p -> p));

        Map<UUID, Integer> qtyByProductId = new HashMap<>();
        for (CheckoutItem item : items) {
            Product product = productById.get(item.productId());
            if (product == null) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "product_not_found");
            }
            if (!product.getStoreId().equals(store.getId())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "product_wrong_store");
            }
            if (!product.isActive()) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "product_inactive");
            }
            qtyByProductId.merge(product.getId(), item.qty(), Integer::sum);
        }

        // TODO: currency strategy to be defined (store-level or price-level).
        String currency = defaultCurrency;

        UUID orderId = UUID.randomUUID();
        List<StoreOrderItem> orderItems = new ArrayList<>();
        BigDecimal subtotal = BigDecimal.ZERO;

        for (CheckoutItem item : items) {
            Product product = productById.get(item.productId());
            BigDecimal unitPrice = BigDecimal.valueOf(product.getPriceCents(), 2);
            BigDecimal lineTotal = unitPrice.multiply(BigDecimal.valueOf(item.qty()));

            String snapshotJson = toJson(Map.of(
                    "name", product.getName(),
                    "unit_price_amount", unitPrice,
                    "currency", currency,
                    "sku", product.getSku()
            ));

            StoreOrderItem orderItem = new StoreOrderItem(
                    UUID.randomUUID(),
                    orderId,
                    product.getId(),
                    item.qty(),
                    unitPrice,
                    lineTotal,
                    currency,
                    snapshotJson
            );

            orderItems.add(orderItem);
            subtotal = subtotal.add(lineTotal);
        }

        StoreShippingZone shippingZone = null;
        BigDecimal shippingCost = BigDecimal.ZERO;
        String shippingCurrency = "";
        String shippingPostalCode = null;
        UUID shippingZoneId = null;
        if (shipping != null && shipping.postalCode() != null && !shipping.postalCode().isBlank()) {
            shippingZone = storeShippingQuoteService.quote(shipping.postalCode());
            shippingCost = shippingZone.getCostAmount();
            shippingCurrency = shippingZone.getCurrency();
            shippingPostalCode = shipping.postalCode();
            shippingZoneId = shippingZone.getId();
        }

        BigDecimal total = subtotal.add(shippingCost);

        StoreOrder order = StoreOrder.create(
                orderId,
                store.getId(),
                currency,
                subtotal,
                total,
                shippingCost,
                shippingCurrency,
                shippingZoneId,
                shippingPostalCode,
                orderItems
        );

        storeOrderRepository.save(order);
        storeOrderItemRepository.saveAll(orderItems);

        Map<String, Object> shippingPayload = new HashMap<>();
        shippingPayload.put("zoneId", shippingZoneId);
        shippingPayload.put("postalCode", shippingPostalCode);
        shippingPayload.put("costAmount", shippingCost);
        shippingPayload.put("currency", shippingCurrency);

        Map<String, Object> payload = new HashMap<>();
        payload.put("storeOrderId", orderId);
        payload.put("storeId", store.getId());
        payload.put("items", orderItems.stream()
                .map(i -> Map.of(
                        "productId", i.getProductId(),
                        "qty", i.getQty(),
                        "unitPriceAmount", i.getUnitPriceAmount(),
                        "currency", i.getCurrency()
                ))
                .toList());
        payload.put("totals", Map.of(
                "subtotal", subtotal,
                "total", total,
                "currency", currency
        ));
        payload.put("shipping", shippingPayload);

        OutboxEvent event = new OutboxEvent(
                UUID.randomUUID(),
                EVENT_TYPE,
                PaymentScope.STORE.name(),
                orderId,
                toJson(payload)
        );
        outboxEventRepository.save(event);

        return order;
    }

    private static String toJson(Object value) {
        try {
            return MAPPER.writeValueAsString(value);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("json_encode_failed", e);
        }
    }
}
