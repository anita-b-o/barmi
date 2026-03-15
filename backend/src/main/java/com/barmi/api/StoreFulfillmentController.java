package com.barmi.api;

import com.barmi.app.fulfillment.CreateFulfillmentForPaidOrderService;
import com.barmi.app.fulfillment.StoreFulfillmentQueryService;
import com.barmi.app.fulfillment.StoreFulfillmentQueryService.StoreFulfillmentDto;
import com.barmi.app.fulfillment.UpdateFulfillmentStatusService;
import com.barmi.app.security.StoreAuthorizationService;
import com.barmi.domain.fulfillment.FulfillmentStatus;
import com.barmi.domain.fulfillment.StoreFulfillment;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/store")
public class StoreFulfillmentController {

    private final CreateFulfillmentForPaidOrderService createFulfillmentForPaidOrderService;
    private final StoreFulfillmentQueryService storeFulfillmentQueryService;
    private final UpdateFulfillmentStatusService updateFulfillmentStatusService;
    private final StoreAuthorizationService storeAuthorizationService;

    public StoreFulfillmentController(
            CreateFulfillmentForPaidOrderService createFulfillmentForPaidOrderService,
            StoreFulfillmentQueryService storeFulfillmentQueryService,
            UpdateFulfillmentStatusService updateFulfillmentStatusService,
            StoreAuthorizationService storeAuthorizationService
    ) {
        this.createFulfillmentForPaidOrderService = createFulfillmentForPaidOrderService;
        this.storeFulfillmentQueryService = storeFulfillmentQueryService;
        this.updateFulfillmentStatusService = updateFulfillmentStatusService;
        this.storeAuthorizationService = storeAuthorizationService;
    }

    public record UpdateStatusReq(@NotNull String status) {}

    @GetMapping("/fulfillments")
    public ResponseEntity<List<StoreFulfillmentDto>> list() {
        return ResponseEntity.ok(storeFulfillmentQueryService.list());
    }

    @GetMapping("/fulfillments/{fulfillmentId}")
    public ResponseEntity<StoreFulfillmentDto> detail(@PathVariable UUID fulfillmentId) {
        return ResponseEntity.ok(storeFulfillmentQueryService.getById(fulfillmentId));
    }

    @PostMapping("/orders/{orderId}/fulfillment")
    public ResponseEntity<?> create(@PathVariable UUID orderId) {
        storeAuthorizationService.requireAdmin();
        StoreFulfillment fulfillment = createFulfillmentForPaidOrderService.create(orderId);

        return ResponseEntity.status(HttpStatus.CREATED).body(storeFulfillmentQueryService.toDto(fulfillment));
    }

    @PatchMapping("/fulfillments/{fulfillmentId}/status")
    public ResponseEntity<?> updateStatus(
            @PathVariable UUID fulfillmentId,
            @Valid @RequestBody UpdateStatusReq req
    ) {
        storeAuthorizationService.requireStaff();
        FulfillmentStatus status = FulfillmentStatus.valueOf(req.status());
        StoreFulfillment fulfillment = updateFulfillmentStatusService.updateStatus(fulfillmentId, status);

        return ResponseEntity.ok(storeFulfillmentQueryService.toDto(fulfillment));
    }
}
