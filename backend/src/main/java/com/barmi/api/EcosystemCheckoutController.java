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
            ShippingReq shipping
    ) {}

    public record CheckoutRes(
            UUID id,
            UUID ecosystemId,
            EcosystemOrderStatus status,
            String currency,
            BigDecimal subtotalAmount,
            BigDecimal shippingCostAmount,
            BigDecimal totalAmount,
            java.time.Instant createdAt
    ) {}

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
                shipping
        );

        CheckoutRes res = new CheckoutRes(
                order.getId(),
                order.getEcosystem().getId(),
                order.getStatus(),
                order.getCurrency(),
                order.getSubtotalAmount(),
                order.getShippingCostAmount(),
                order.getTotalAmount(),
                order.getCreatedAt()
        );

        return ResponseEntity.status(HttpStatus.CREATED).body(res);
    }
}
