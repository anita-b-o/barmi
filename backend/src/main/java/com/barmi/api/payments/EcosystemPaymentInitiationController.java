package com.barmi.api.payments;

import com.barmi.app.payments.PaymentInitiationService;
import com.barmi.domain.payments.PaymentIntent;
import com.barmi.domain.payments.PaymentStatus;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@RestController
@RequestMapping("/api/ecosystem/payments")
public class EcosystemPaymentInitiationController {

    private final PaymentInitiationService paymentInitiationService;

    public EcosystemPaymentInitiationController(PaymentInitiationService paymentInitiationService) {
        this.paymentInitiationService = paymentInitiationService;
    }

    public record InitiateEcosystemPaymentRequest(
            UUID ecosystemId,
            UUID orderId,
            String provider,
            String returnUrl
    ) {}

    public record InitiatePaymentResponse(
            UUID intentId,
            String scope,
            UUID orderId,
            PaymentStatus status,
            BigDecimal amount,
            String currency,
            Instant createdAt,
            String checkoutUrl,
            String provider,
            String providerPreferenceId
    ) {}

    @PostMapping("/initiate")
    public ResponseEntity<?> initiate(@RequestBody InitiateEcosystemPaymentRequest request) {
        PaymentIntent intent = paymentInitiationService.initiateEcosystemPayment(
                request.ecosystemId(),
                request.orderId(),
                request.provider(),
                request.returnUrl()
        );

        InitiatePaymentResponse response = new InitiatePaymentResponse(
                intent.getId(),
                intent.getScope().name(),
                intent.getEcosystemOrderId(),
                intent.getStatus(),
                intent.getAmount(),
                intent.getCurrency(),
                intent.getCreatedAt(),
                intent.getCheckoutUrl(),
                intent.getProvider(),
                intent.getProviderPreferenceId()
        );

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
}
