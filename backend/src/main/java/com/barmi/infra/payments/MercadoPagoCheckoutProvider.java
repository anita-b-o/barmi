package com.barmi.infra.payments;

import com.barmi.app.payments.PaymentProviderClient;
import org.springframework.http.HttpStatus;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class MercadoPagoCheckoutProvider implements PaymentProviderClient {
    private static final String PROVIDER = "MERCADOPAGO";
    private final MercadoPagoApiClient mercadoPagoApiClient;
    private final String checkoutBaseUrl;
    private final boolean stubEnabled;

    public MercadoPagoCheckoutProvider(
            MercadoPagoApiClient mercadoPagoApiClient,
            @Value("${app.mercadoPago.checkoutBaseUrl:https://checkout.mercadopago.example}") String checkoutBaseUrl,
            @Value("${app.mercadoPago.stubEnabled:false}") boolean stubEnabled
    ) {
        this.mercadoPagoApiClient = mercadoPagoApiClient;
        this.checkoutBaseUrl = checkoutBaseUrl;
        this.stubEnabled = stubEnabled;
    }

    @Override
    public String provider() {
        return PROVIDER;
    }

    @Override
    public CheckoutResponse createCheckout(CheckoutRequest request) {
        if (!mercadoPagoApiClient.isConfigured()) {
            if (!stubEnabled) {
                throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "payment_provider_unavailable");
            }
            String base = checkoutBaseUrl == null || checkoutBaseUrl.isBlank()
                    ? "https://checkout.mercadopago.example"
                    : checkoutBaseUrl;
            String preferenceId = request.intentId().toString();
            String checkoutUrl = base.endsWith("/") ? base + preferenceId : base + "/" + preferenceId;
            return new CheckoutResponse(checkoutUrl, preferenceId);
        }

        if (request.notificationUrl() == null || request.notificationUrl().isBlank()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "payment_provider_unavailable");
        }

        String title = request.scope().name() + " order " + (request.storeOrderId() != null ? request.storeOrderId() : request.ecosystemOrderId());
        MercadoPagoApiClient.PreferenceResponse response = mercadoPagoApiClient.createPreference(
                new MercadoPagoApiClient.PreferenceRequest(
                        java.util.List.of(new MercadoPagoApiClient.PreferenceItem(
                                request.intentId().toString(),
                                title,
                                title,
                                1,
                                request.currency(),
                                request.amount()
                        )),
                        new MercadoPagoApiClient.PreferenceBackUrls(
                                request.returnUrl(),
                                request.returnUrl(),
                                request.returnUrl()
                        ),
                        "approved",
                        request.notificationUrl(),
                        request.externalReference(),
                        request.metadata()
                )
        );

        String checkoutUrl = response.initPoint() == null || response.initPoint().isBlank()
                ? response.sandboxInitPoint()
                : response.initPoint();
        if (checkoutUrl == null || checkoutUrl.isBlank() || response.id() == null || response.id().isBlank()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "payment_provider_unavailable");
        }
        return new CheckoutResponse(checkoutUrl, response.id());
    }
}
