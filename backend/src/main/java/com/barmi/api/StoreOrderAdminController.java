package com.barmi.api;

import com.barmi.app.orders.StoreOrderAdminService;
import com.barmi.app.orders.StoreOrderQueryService;
import com.barmi.domain.orders.StoreOrderStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;
import java.time.Instant;

@RestController
@RequestMapping("/api/store/admin/orders")
public class StoreOrderAdminController {

    private final StoreOrderAdminService storeOrderAdminService;
    private final StoreOrderQueryService storeOrderQueryService;

    public StoreOrderAdminController(
            StoreOrderAdminService storeOrderAdminService,
            StoreOrderQueryService storeOrderQueryService
    ) {
        this.storeOrderAdminService = storeOrderAdminService;
        this.storeOrderQueryService = storeOrderQueryService;
    }

    @GetMapping("/{orderId}")
    public ResponseEntity<StoreOrderQueryService.AdminOrderView> detail(@PathVariable UUID orderId) {
        return ResponseEntity.ok(storeOrderQueryService.getAdminOrder(orderId));
    }

    @GetMapping
    public ResponseEntity<StoreOrderQueryService.PageResult<StoreOrderQueryService.AdminOrderSummaryView>> list(
            @RequestParam(required = false) StoreOrderStatus status,
            @RequestParam(required = false) Instant createdFrom,
            @RequestParam(required = false) Instant createdTo,
            @RequestParam(required = false) Instant paidFrom,
            @RequestParam(required = false) Instant paidTo,
            @RequestParam(required = false) Boolean hasOperationalConflict,
            @RequestParam(required = false) Boolean manuallyCancelled,
            @RequestParam(required = false) Instant manualCancelledFrom,
            @RequestParam(required = false) Instant manualCancelledTo,
            @RequestParam(required = false) Boolean hasConflictEvent,
            @RequestParam(required = false) Instant conflictFrom,
            @RequestParam(required = false) Instant conflictTo,
            @RequestParam(required = false) Boolean hasFulfillment,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String sort
    ) {
        return ResponseEntity.ok(storeOrderQueryService.listAdminOrders(
                status,
                createdFrom,
                createdTo,
                paidFrom,
                paidTo,
                hasOperationalConflict,
                manuallyCancelled,
                manualCancelledFrom,
                manualCancelledTo,
                hasConflictEvent,
                conflictFrom,
                conflictTo,
                hasFulfillment,
                page,
                size,
                sort
        ));
    }

    @PostMapping("/{orderId}/cancel")
    public ResponseEntity<StoreOrderQueryService.AdminOrderView> cancel(@PathVariable UUID orderId) {
        storeOrderAdminService.cancelOrder(orderId);
        return ResponseEntity.ok(storeOrderQueryService.getAdminOrder(orderId));
    }

    @PostMapping("/{orderId}/retry-processing")
    public ResponseEntity<StoreOrderAdminService.RetryProcessingResult> retryProcessing(@PathVariable UUID orderId) {
        return ResponseEntity.ok(storeOrderAdminService.retryProcessing(orderId));
    }
}
