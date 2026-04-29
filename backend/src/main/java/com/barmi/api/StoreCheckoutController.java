package com.barmi.api;

import com.barmi.app.orders.CheckoutStoreOrderService;
import com.barmi.domain.orders.StoreOrder;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/store")
public class StoreCheckoutController {

    private final CheckoutStoreOrderService checkoutStoreOrderService;

    public StoreCheckoutController(CheckoutStoreOrderService checkoutStoreOrderService) {
        this.checkoutStoreOrderService = checkoutStoreOrderService;
    }

    public record CheckoutItemReq(
            @NotNull UUID productId,
            @Min(1) int qty
    ) {}

    public record ShippingReq(String postalCode) {}

    public record CheckoutReq(
            @NotEmpty @Valid List<CheckoutItemReq> items,
            ShippingReq shipping,
            String couponCode,
            @Email String buyerEmail
    ) {}

    @PostMapping("/checkout/preview")
    public ResponseEntity<?> preview(@Valid @RequestBody CheckoutReq req) {
        List<CheckoutStoreOrderService.CheckoutItem> items = req.items().stream()
                .map(i -> new CheckoutStoreOrderService.CheckoutItem(i.productId(), i.qty()))
                .toList();

        CheckoutStoreOrderService.ShippingRequest shipping = null;
        if (req.shipping() != null) {
            shipping = new CheckoutStoreOrderService.ShippingRequest(req.shipping().postalCode());
        }

        CheckoutStoreOrderService.CheckoutAmounts amounts = checkoutStoreOrderService.preview(items, shipping, req.couponCode());
        return ResponseEntity.ok(buildCheckoutAmountsBody(amounts));
    }

    @PostMapping("/checkout")
    public ResponseEntity<?> checkout(@Valid @RequestBody CheckoutReq req) {
        List<CheckoutStoreOrderService.CheckoutItem> items = req.items().stream()
                .map(i -> new CheckoutStoreOrderService.CheckoutItem(i.productId(), i.qty()))
                .toList();

        CheckoutStoreOrderService.ShippingRequest shipping = null;
        if (req.shipping() != null) {
            shipping = new CheckoutStoreOrderService.ShippingRequest(req.shipping().postalCode());
        }

        StoreOrder order = checkoutStoreOrderService.checkout(items, shipping, req.couponCode(), req.buyerEmail());

        Map<String, Object> body = new java.util.HashMap<>();
        body.putAll(buildCheckoutAmountsBody(
                new CheckoutStoreOrderService.CheckoutAmounts(
                        order.getCurrency(),
                        order.getSubtotalAmount(),
                        order.getShippingCostAmount(),
                        order.getShippingCurrency(),
                        order.getShippingZoneId(),
                        order.getShippingPostalCode(),
                        order.getOriginalAmount(),
                        order.getDiscountAmount(),
                        order.getTotalAmount(),
                        order.getAppliedPromotionId(),
                        order.getAppliedCouponCode()
                )
        ));
        body.put("orderId", order.getId());
        body.put("status", order.getStatus());
        body.put("createdAt", order.getCreatedAt());

        return ResponseEntity.status(HttpStatus.CREATED).body(body);
    }

    private Map<String, Object> buildCheckoutAmountsBody(CheckoutStoreOrderService.CheckoutAmounts amounts) {
        Map<String, Object> body = new java.util.HashMap<>();
        body.put("subtotalAmount", amounts.subtotalAmount());
        body.put("originalAmount", amounts.originalAmount());
        body.put("discountAmount", amounts.discountAmount());
        body.put("appliedCouponCode", amounts.appliedCouponCode());
        body.put("totalAmount", amounts.totalAmount());
        body.put("currency", amounts.currency());
        body.put("shippingCostAmount", amounts.shippingCostAmount());
        body.put("shippingCurrency", amounts.shippingCurrency());
        body.put("shippingZoneId", amounts.shippingZoneId());
        body.put("shippingPostalCode", amounts.shippingPostalCode());
        return body;
    }
}
