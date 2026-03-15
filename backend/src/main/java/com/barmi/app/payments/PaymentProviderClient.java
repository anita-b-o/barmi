package com.barmi.app.payments;

import com.barmi.domain.enums.PaymentScope;

import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;

public interface PaymentProviderClient {
    String provider();

    CheckoutResponse createCheckout(CheckoutRequest request);

    record CheckoutRequest(
            UUID intentId,
            PaymentScope scope,
            UUID storeOrderId,
            UUID ecosystemOrderId,
            UUID storeId,
            UUID ecosystemId,
            BigDecimal amount,
            String currency,
            String returnUrl,
            Map<String, Object> metadata
    ) {}

    record CheckoutResponse(
            String checkoutUrl,
            String providerPreferenceId
    ) {}
}
