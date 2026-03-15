package com.barmi.api;

import com.barmi.app.orders.StoreOrderQueryService;
import com.barmi.domain.orders.StoreOrderStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/store/orders")
public class StoreOrderQueryController {

    private final StoreOrderQueryService storeOrderQueryService;

    public StoreOrderQueryController(StoreOrderQueryService storeOrderQueryService) {
        this.storeOrderQueryService = storeOrderQueryService;
    }

    @GetMapping("/{orderId}")
    public StoreOrderQueryService.OrderView getById(@PathVariable UUID orderId) {
        return storeOrderQueryService.getOrder(orderId);
    }

    @GetMapping
    public StoreOrderQueryService.PageResult<StoreOrderQueryService.OrderSummaryView> list(
            @RequestParam(required = false) StoreOrderStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String sort
    ) {
        return storeOrderQueryService.listOrders(status, page, size, sort);
    }
}
