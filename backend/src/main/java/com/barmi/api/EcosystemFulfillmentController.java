package com.barmi.api;

import com.barmi.app.ecosystem.EcosystemFulfillmentService;
import com.barmi.app.ecosystem.EcosystemFulfillmentQueryService;
import com.barmi.app.ecosystem.EcosystemFulfillmentQueryService.EcosystemFulfillmentDto;
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

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/ecosystem")
public class EcosystemFulfillmentController {

    private final EcosystemFulfillmentService ecosystemFulfillmentService;
    private final EcosystemFulfillmentQueryService ecosystemFulfillmentQueryService;
    private final EcosystemOrderRepository ecosystemOrderRepository;
    private final EcosystemFulfillmentRepository ecosystemFulfillmentRepository;
    private final EcosystemAuthorizationService ecosystemAuthorizationService;

    public EcosystemFulfillmentController(
            EcosystemFulfillmentService ecosystemFulfillmentService,
            EcosystemFulfillmentQueryService ecosystemFulfillmentQueryService,
            EcosystemOrderRepository ecosystemOrderRepository,
            EcosystemFulfillmentRepository ecosystemFulfillmentRepository,
            EcosystemAuthorizationService ecosystemAuthorizationService
    ) {
        this.ecosystemFulfillmentService = ecosystemFulfillmentService;
        this.ecosystemFulfillmentQueryService = ecosystemFulfillmentQueryService;
        this.ecosystemOrderRepository = ecosystemOrderRepository;
        this.ecosystemFulfillmentRepository = ecosystemFulfillmentRepository;
        this.ecosystemAuthorizationService = ecosystemAuthorizationService;
    }

    public record UpdateStatusReq(@NotNull String status) {}

    @GetMapping("/fulfillments")
    public ResponseEntity<List<EcosystemFulfillmentDto>> list(
            @RequestParam @NotNull UUID ecosystemId,
            @RequestParam(required = false) java.time.Instant createdFrom,
            @RequestParam(required = false) java.time.Instant createdTo
    ) {
        return ResponseEntity.ok(ecosystemFulfillmentQueryService.list(ecosystemId, createdFrom, createdTo));
    }

    @GetMapping("/fulfillments/{fulfillmentId}")
    public ResponseEntity<EcosystemFulfillmentDto> detail(
            @PathVariable UUID fulfillmentId,
            @RequestParam @NotNull UUID ecosystemId
    ) {
        return ResponseEntity.ok(ecosystemFulfillmentQueryService.getById(fulfillmentId, ecosystemId));
    }

    @PostMapping("/orders/{orderId}/fulfillment")
    public ResponseEntity<?> create(@PathVariable UUID orderId) {
        EcosystemOrder order = ecosystemOrderRepository.findById(orderId).orElse(null);
        if (order != null) {
            ecosystemAuthorizationService.requireAdmin(order.getEcosystem().getId());
        }
        EcosystemFulfillment fulfillment = ecosystemFulfillmentService.create(orderId);

        return ResponseEntity.status(HttpStatus.CREATED).body(ecosystemFulfillmentQueryService.toDto(fulfillment));
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

        return ResponseEntity.ok(ecosystemFulfillmentQueryService.toDto(fulfillment));
    }
}
