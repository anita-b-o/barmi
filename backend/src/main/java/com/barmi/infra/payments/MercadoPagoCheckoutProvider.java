package com.barmi.infra.payments;

import com.barmi.app.payments.PaymentProviderClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
public class MercadoPagoCheckoutProvider implements PaymentProviderClient {
    private static final String PROVIDER = "MERCADOPAGO";
    private final String checkoutBaseUrl;

    public MercadoPagoCheckoutProvider(
            @Value("${app.mercadoPago.checkoutBaseUrl:https://checkout.mercadopago.example}") String checkoutBaseUrl
    ) {
        this.checkoutBaseUrl = checkoutBaseUrl;
    }

    @Override
    public String provider() {
        return PROVIDER;
    }

    @Override
    public CheckoutResponse createCheckout(CheckoutRequest request) {
        String preferenceId = UUID.randomUUID().toString();
        String base = checkoutBaseUrl == null || checkoutBaseUrl.isBlank()
                ? "https://checkout.mercadopago.example"
                : checkoutBaseUrl;
        String checkoutUrl = base.endsWith("/") ? base + preferenceId : base + "/" + preferenceId;
        return new CheckoutResponse(checkoutUrl, preferenceId);
    }
}
