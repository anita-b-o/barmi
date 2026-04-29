package com.barmi.api;

import com.barmi.app.ecosystem.EcosystemCheckoutService;
import com.barmi.domain.orders.EcosystemOrder;
import com.barmi.domain.orders.EcosystemOrderStatus;
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

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/ecosystem")
public class EcosystemCheckoutController {

    private final EcosystemCheckoutService ecosystemCheckoutService;

    public EcosystemCheckoutController(EcosystemCheckoutService ecosystemCheckoutService) {
        this.ecosystemCheckoutService = ecosystemCheckoutService;
    }

    public record CheckoutItemReq(
            @NotNull UUID externalProductId,
            @Min(1) int qty
    ) {}

    public record ShippingReq(String postalCode) {}

    public record CheckoutReq(
            @NotNull UUID ecosystemId,
            @NotEmpty @Valid List<CheckoutItemReq> items,
            ShippingReq shipping,
            String couponCode
    ) {}

    @PostMapping("/checkout/preview")
    public ResponseEntity<?> preview(@Valid @RequestBody CheckoutReq req) {
        List<EcosystemCheckoutService.CheckoutItem> items = req.items().stream()
                .map(i -> new EcosystemCheckoutService.CheckoutItem(i.externalProductId(), i.qty()))
                .toList();

        EcosystemCheckoutService.ShippingRequest shipping = null;
        if (req.shipping() != null) {
            shipping = new EcosystemCheckoutService.ShippingRequest(req.shipping().postalCode());
        }

        EcosystemCheckoutService.CheckoutAmounts amounts = ecosystemCheckoutService.preview(
                req.ecosystemId(),
                items,
                shipping,
                req.couponCode()
        );
        return ResponseEntity.ok(buildCheckoutAmountsBody(amounts));
    }

    @PostMapping("/checkout")
    public ResponseEntity<?> checkout(@Valid @RequestBody CheckoutReq req) {
        List<EcosystemCheckoutService.CheckoutItem> items = req.items().stream()
                .map(i -> new EcosystemCheckoutService.CheckoutItem(i.externalProductId(), i.qty()))
                .toList();

        EcosystemCheckoutService.ShippingRequest shipping = null;
        if (req.shipping() != null) {
            shipping = new EcosystemCheckoutService.ShippingRequest(req.shipping().postalCode());
        }

        EcosystemOrder order = ecosystemCheckoutService.checkout(
                req.ecosystemId(),
                items,
                shipping,
                req.couponCode()
        );

        java.util.Map<String, Object> body = new java.util.HashMap<>();
        body.putAll(buildCheckoutAmountsBody(
                new EcosystemCheckoutService.CheckoutAmounts(
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
        body.put("id", order.getId());
        body.put("ecosystemId", order.getEcosystem().getId());
        body.put("status", order.getStatus());
        body.put("createdAt", order.getCreatedAt());

        return ResponseEntity.status(HttpStatus.CREATED).body(body);
    }

    private java.util.Map<String, Object> buildCheckoutAmountsBody(EcosystemCheckoutService.CheckoutAmounts amounts) {
        java.util.Map<String, Object> body = new java.util.HashMap<>();
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
