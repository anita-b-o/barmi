package com.barmi.api.webhooks;

import com.fasterxml.jackson.annotation.JsonAlias;

import java.math.BigDecimal;

public record MercadoPagoStoreWebhookRequest(
        @JsonAlias({"eventId", "event_id", "id"}) String eventId,
        @JsonAlias("status") String status,
        String type,
        String action,
        @JsonAlias("operation_id") String operationId,
        @JsonAlias("provider_payment_id") String providerPaymentId,
        @JsonAlias("amount") BigDecimal amount,
        @JsonAlias("currency") String currency,
        Data data
) {
    public record Data(String id) {}
}
