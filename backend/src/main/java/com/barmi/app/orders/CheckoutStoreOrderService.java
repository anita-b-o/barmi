package com.barmi.app.orders;

import com.barmi.app.catalog.StorePromotionService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import com.barmi.app.security.StoreAuthorizationService;
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
    private static final Logger log = LoggerFactory.getLogger(CheckoutStoreOrderService.class);

    private final String defaultCurrency;
    private final StoreRepository storeRepository;
    private final ProductRepository productRepository;
    private final StoreOrderRepository storeOrderRepository;
    private final StoreOrderItemRepository storeOrderItemRepository;
    private final OutboxEventRepository outboxEventRepository;
    private final StoreShippingQuoteService storeShippingQuoteService;
    private final StorePromotionService storePromotionService;
    private final StoreAuthorizationService storeAuthorizationService;

    public CheckoutStoreOrderService(
            @Value("${app.money.defaultCurrency}") String defaultCurrency,
            StoreRepository storeRepository,
            ProductRepository productRepository,
            StoreOrderRepository storeOrderRepository,
            StoreOrderItemRepository storeOrderItemRepository,
            OutboxEventRepository outboxEventRepository,
            StoreShippingQuoteService storeShippingQuoteService,
            StorePromotionService storePromotionService,
            StoreAuthorizationService storeAuthorizationService
    ) {
        this.defaultCurrency = defaultCurrency;
        this.storeRepository = storeRepository;
        this.productRepository = productRepository;
        this.storeOrderRepository = storeOrderRepository;
        this.storeOrderItemRepository = storeOrderItemRepository;
        this.outboxEventRepository = outboxEventRepository;
        this.storeShippingQuoteService = storeShippingQuoteService;
        this.storePromotionService = storePromotionService;
        this.storeAuthorizationService = storeAuthorizationService;
    }

    public record CheckoutItem(UUID productId, int qty) {}
    public record ShippingRequest(String postalCode) {}
    public record CheckoutAmounts(
            String currency,
            BigDecimal subtotalAmount,
            BigDecimal shippingCostAmount,
            String shippingCurrency,
            UUID shippingZoneId,
            String shippingPostalCode,
            BigDecimal originalAmount,
            BigDecimal discountAmount,
            BigDecimal totalAmount,
            UUID appliedPromotionId,
            String appliedCouponCode
    ) {}

    @Transactional
    public StoreOrder checkout(List<CheckoutItem> items, ShippingRequest shipping, String couponCode) {
        return checkout(items, shipping, couponCode, null);
    }

    @Transactional
    public StoreOrder checkout(List<CheckoutItem> items, ShippingRequest shipping, String couponCode, String buyerEmail) {
        CheckoutContext context = prepareCheckout(items, shipping);
        CheckoutAmounts amounts = calculateAmounts(context, couponCode);
        String resolvedBuyerEmail = resolveBuyerEmail(buyerEmail);

        StoreOrder order = StoreOrder.create(
                context.orderId(),
                context.store().getId(),
                context.currency(),
                amounts.subtotalAmount(),
                amounts.totalAmount(),
                amounts.shippingCostAmount(),
                amounts.shippingCurrency(),
                amounts.shippingZoneId(),
                amounts.shippingPostalCode(),
                amounts.originalAmount(),
                amounts.discountAmount(),
                amounts.appliedPromotionId(),
                amounts.appliedCouponCode(),
                resolvedBuyerEmail,
                context.orderItems()
        );

        storeOrderRepository.save(order);
        storeOrderItemRepository.saveAll(context.orderItems());

        outboxEventRepository.save(buildCreatedEvent(order, context.store(), context.orderItems(), amounts));
        log.info(
                "checkout_created request_id={} store_id={} order_id={} item_count={} total_amount={}",
                MDC.get("requestId"),
                context.store().getId(),
                order.getId(),
                context.orderItems().size(),
                amounts.totalAmount()
        );

        return order;
    }

    @Transactional(readOnly = true)
    public CheckoutAmounts preview(List<CheckoutItem> items, ShippingRequest shipping, String couponCode) {
        CheckoutContext context = prepareCheckout(items, shipping);
        return calculateAmounts(context, couponCode);
    }

    public StoreOrder checkout(List<CheckoutItem> items, ShippingRequest shipping) {
        return checkout(items, shipping, null, null);
    }

    private CheckoutContext prepareCheckout(List<CheckoutItem> items, ShippingRequest shipping) {
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

        for (Map.Entry<UUID, Integer> entry : qtyByProductId.entrySet()) {
            Product product = productById.get(entry.getKey());
            if (product.getStockQuantity() < entry.getValue()) {
                log.warn(
                        "checkout_failure category=api_error_checkout_failure request_id={} store_id={} product_id={} failure_reason=stock_conflict requested_qty={} available_qty={}",
                        MDC.get("requestId"),
                        store.getId(),
                        product.getId(),
                        entry.getValue(),
                        product.getStockQuantity()
                );
                throw new ResponseStatusException(HttpStatus.CONFLICT, "product_out_of_stock");
            }
        }

        // TODO: currency strategy to be defined (store-level or price-level).
        String currency = defaultCurrency;
        List<StoreOrderItem> orderItems = new ArrayList<>();
        BigDecimal subtotal = BigDecimal.ZERO;
        UUID orderId = UUID.randomUUID();

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

        return new CheckoutContext(
                store,
                orderId,
                currency,
                orderItems,
                subtotal,
                shippingCost,
                shippingCurrency,
                shippingZoneId,
                shippingPostalCode
        );
    }

    private CheckoutAmounts calculateAmounts(CheckoutContext context, String couponCode) {
        BigDecimal originalAmount = context.subtotalAmount().add(context.shippingCostAmount());
        StorePromotionService.PromotionApplication promotion = storePromotionService.preview(
                context.store().getId(),
                couponCode,
                originalAmount
        );
        return new CheckoutAmounts(
                context.currency(),
                context.subtotalAmount(),
                context.shippingCostAmount(),
                context.shippingCurrency(),
                context.shippingZoneId(),
                context.shippingPostalCode(),
                promotion.originalAmount(),
                promotion.discountAmount(),
                promotion.finalAmount(),
                promotion.promotionId(),
                promotion.code()
        );
    }

    private OutboxEvent buildCreatedEvent(
            StoreOrder order,
            Store store,
            List<StoreOrderItem> orderItems,
            CheckoutAmounts amounts
    ) {
        Map<String, Object> shippingPayload = new HashMap<>();
        shippingPayload.put("zoneId", amounts.shippingZoneId());
        shippingPayload.put("postalCode", amounts.shippingPostalCode());
        shippingPayload.put("costAmount", amounts.shippingCostAmount());
        shippingPayload.put("currency", amounts.shippingCurrency());

        Map<String, Object> payload = new HashMap<>();
        payload.put("storeOrderId", order.getId());
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
                "subtotal", amounts.subtotalAmount(),
                "originalAmount", amounts.originalAmount(),
                "discountAmount", amounts.discountAmount(),
                "total", amounts.totalAmount(),
                "currency", order.getCurrency()
        ));
        if (amounts.appliedCouponCode() != null) {
            payload.put("promotion", Map.of(
                    "promotionId", amounts.appliedPromotionId(),
                    "couponCode", amounts.appliedCouponCode()
            ));
        }
        payload.put("shipping", shippingPayload);

        return new OutboxEvent(
                UUID.randomUUID(),
                EVENT_TYPE,
                PaymentScope.STORE.name(),
                order.getId(),
                toJson(payload)
        );
    }

    private record CheckoutContext(
            Store store,
            UUID orderId,
            String currency,
            List<StoreOrderItem> orderItems,
            BigDecimal subtotalAmount,
            BigDecimal shippingCostAmount,
            String shippingCurrency,
            UUID shippingZoneId,
            String shippingPostalCode
    ) {}

    private String resolveBuyerEmail(String buyerEmail) {
        String explicitBuyerEmail = normalizeEmail(buyerEmail);
        if (explicitBuyerEmail != null) {
            return explicitBuyerEmail;
        }

        String currentEmail = normalizeEmail(storeAuthorizationService.currentEmail());
        if (currentEmail != null) {
            return currentEmail;
        }

        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "buyer_email_required");
    }

    private String normalizeEmail(String email) {
        if (email == null) {
            return null;
        }
        String normalized = email.trim();
        return normalized.isBlank() ? null : normalized;
    }

    private static String toJson(Object value) {
        try {
            return MAPPER.writeValueAsString(value);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("json_encode_failed", e);
        }
    }
}
