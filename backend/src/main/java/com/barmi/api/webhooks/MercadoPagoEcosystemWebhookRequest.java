package com.barmi.api.webhooks;

import com.fasterxml.jackson.annotation.JsonAlias;

import java.math.BigDecimal;

public record MercadoPagoEcosystemWebhookRequest(
        @JsonAlias({"eventId", "event_id", "id"}) String eventId,
        String status,
        String type,
        String action,
        @JsonAlias({"ecosystemOrderId", "operation_id"}) String ecosystemOrderId,
        @JsonAlias({"providerPaymentId", "provider_payment_id", "payment_id"}) String providerPaymentId,
        BigDecimal amount,
        @JsonAlias("transaction_amount") BigDecimal transactionAmount,
        String currency,
        @JsonAlias("currency_id") String currencyId,
        Metadata metadata,
        Data data
) {
    public record Metadata(String ecosystemOrderId) {}

    public record Data(String id, BigDecimal amount) {}
}
