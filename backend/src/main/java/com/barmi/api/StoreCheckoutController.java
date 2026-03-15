package com.barmi.api;

import com.barmi.app.orders.CheckoutStoreOrderService;
import com.barmi.domain.orders.StoreOrder;
import jakarta.validation.Valid;
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
            ShippingReq shipping
    ) {}

    @PostMapping("/checkout")
    public ResponseEntity<?> checkout(@Valid @RequestBody CheckoutReq req) {
        List<CheckoutStoreOrderService.CheckoutItem> items = req.items().stream()
                .map(i -> new CheckoutStoreOrderService.CheckoutItem(i.productId(), i.qty()))
                .toList();

        CheckoutStoreOrderService.ShippingRequest shipping = null;
        if (req.shipping() != null) {
            shipping = new CheckoutStoreOrderService.ShippingRequest(req.shipping().postalCode());
        }

        StoreOrder order = checkoutStoreOrderService.checkout(items, shipping);

        Map<String, Object> body = new java.util.HashMap<>();
        body.put("orderId", order.getId());
        body.put("status", order.getStatus());
        body.put("currency", order.getCurrency());
        body.put("subtotalAmount", order.getSubtotalAmount());
        body.put("totalAmount", order.getTotalAmount());
        body.put("shippingCostAmount", order.getShippingCostAmount());
        body.put("shippingCurrency", order.getShippingCurrency());
        body.put("shippingZoneId", order.getShippingZoneId());
        body.put("shippingPostalCode", order.getShippingPostalCode());
        body.put("createdAt", order.getCreatedAt());

        return ResponseEntity.status(HttpStatus.CREATED).body(body);
    }
}
