package com.barmi.api;

import com.barmi.app.ecosystem.EcosystemOrderQueryService;
import com.barmi.domain.orders.EcosystemOrderStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/ecosystem/orders")
public class EcosystemOrderQueryController {

    private final EcosystemOrderQueryService ecosystemOrderQueryService;

    public EcosystemOrderQueryController(EcosystemOrderQueryService ecosystemOrderQueryService) {
        this.ecosystemOrderQueryService = ecosystemOrderQueryService;
    }

    @GetMapping("/{orderId}")
    public EcosystemOrderQueryService.OrderView getById(@PathVariable UUID orderId) {
        return ecosystemOrderQueryService.getOrder(orderId);
    }

    @GetMapping
    public EcosystemOrderQueryService.PageResult<EcosystemOrderQueryService.OrderSummaryView> list(
            @RequestParam(required = false) EcosystemOrderStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String sort
    ) {
        return ecosystemOrderQueryService.listOrders(status, page, size, sort);
    }
}
