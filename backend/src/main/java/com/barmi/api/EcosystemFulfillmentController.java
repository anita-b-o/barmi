package com.barmi.api;

import com.barmi.app.ecosystem.EcosystemFulfillmentService;
import com.barmi.app.security.EcosystemAuthorizationService;
import com.barmi.domain.fulfillment.EcosystemFulfillment;
import com.barmi.domain.fulfillment.FulfillmentStatus;
import com.barmi.domain.orders.EcosystemOrder;
import com.barmi.infra.repo.EcosystemFulfillmentRepository;
import com.barmi.infra.repo.EcosystemOrderRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/ecosystem")
public class EcosystemFulfillmentController {

    private final EcosystemFulfillmentService ecosystemFulfillmentService;
    private final EcosystemOrderRepository ecosystemOrderRepository;
    private final EcosystemFulfillmentRepository ecosystemFulfillmentRepository;
    private final EcosystemAuthorizationService ecosystemAuthorizationService;

    public EcosystemFulfillmentController(
            EcosystemFulfillmentService ecosystemFulfillmentService,
            EcosystemOrderRepository ecosystemOrderRepository,
            EcosystemFulfillmentRepository ecosystemFulfillmentRepository,
            EcosystemAuthorizationService ecosystemAuthorizationService
    ) {
        this.ecosystemFulfillmentService = ecosystemFulfillmentService;
        this.ecosystemOrderRepository = ecosystemOrderRepository;
        this.ecosystemFulfillmentRepository = ecosystemFulfillmentRepository;
        this.ecosystemAuthorizationService = ecosystemAuthorizationService;
    }

    public record UpdateStatusReq(@NotNull String status) {}

    @PostMapping("/orders/{orderId}/fulfillment")
    public ResponseEntity<?> create(@PathVariable UUID orderId) {
        EcosystemOrder order = ecosystemOrderRepository.findById(orderId).orElse(null);
        if (order != null) {
            ecosystemAuthorizationService.requireStaff(order.getEcosystem().getId());
        }
        EcosystemFulfillment fulfillment = ecosystemFulfillmentService.create(orderId);

        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "fulfillmentId", fulfillment.getId(),
                "ecosystemOrderId", fulfillment.getEcosystemOrderId(),
                "ecosystemId", fulfillment.getEcosystemId(),
                "status", fulfillment.getStatus().name(),
                "method", fulfillment.getMethod(),
                "createdAt", fulfillment.getCreatedAt()
        ));
    }

    @PatchMapping("/fulfillments/{fulfillmentId}/status")
    public ResponseEntity<?> updateStatus(
            @PathVariable UUID fulfillmentId,
            @Valid @RequestBody UpdateStatusReq req
    ) {
        EcosystemFulfillment existing = ecosystemFulfillmentRepository.findById(fulfillmentId).orElse(null);
        if (existing != null) {
            ecosystemAuthorizationService.requireStaff(existing.getEcosystemId());
        }
        FulfillmentStatus status = FulfillmentStatus.valueOf(req.status());
        EcosystemFulfillment fulfillment = ecosystemFulfillmentService.updateStatus(fulfillmentId, status);

        return ResponseEntity.ok(Map.of(
                "fulfillmentId", fulfillment.getId(),
                "ecosystemOrderId", fulfillment.getEcosystemOrderId(),
                "ecosystemId", fulfillment.getEcosystemId(),
                "status", fulfillment.getStatus().name(),
                "method", fulfillment.getMethod(),
                "createdAt", fulfillment.getCreatedAt()
        ));
    }
}
