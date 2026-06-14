package com.barmi.app.payments;

import com.barmi.app.tenant.TenantContext;
import com.barmi.domain.ecosystem.Ecosystem;
import com.barmi.domain.enums.PaymentScope;
import com.barmi.domain.orders.EcosystemOrder;
import com.barmi.domain.orders.EcosystemOrderStatus;
import com.barmi.domain.orders.StoreOrder;
import com.barmi.domain.orders.StoreOrderStatus;
import com.barmi.domain.payments.PaymentIntent;
import com.barmi.domain.payments.PaymentStatus;
import com.barmi.domain.store.Store;
import com.barmi.infra.repo.EcosystemOrderRepository;
import com.barmi.infra.repo.PaymentIntentRepository;
import com.barmi.infra.repo.StoreOrderRepository;
import com.barmi.infra.repo.StoreRepository;
import com.barmi.infra.metrics.PaymentOperationalMetrics;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.CONFLICT;
import static org.springframework.http.HttpStatus.NOT_FOUND;
import static org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE;

@Service
public class PaymentInitiationService {
    private static final Logger log = LoggerFactory.getLogger(PaymentInitiationService.class);
    private final StoreRepository storeRepository;
    private final StoreOrderRepository storeOrderRepository;
    private final EcosystemOrderRepository ecosystemOrderRepository;
    private final PaymentIntentRepository paymentIntentRepository;
    private final PaymentProviderRegistry paymentProviderRegistry;
    private final PaymentOperationalMetrics paymentOperationalMetrics;
    private final String mercadoPagoPublicBaseUrl;

    public PaymentInitiationService(
            StoreRepository storeRepository,
            StoreOrderRepository storeOrderRepository,
            EcosystemOrderRepository ecosystemOrderRepository,
            PaymentIntentRepository paymentIntentRepository,
            PaymentProviderRegistry paymentProviderRegistry,
            PaymentOperationalMetrics paymentOperationalMetrics,
            @Value("${app.mercadoPago.publicBaseUrl:}") String mercadoPagoPublicBaseUrl
    ) {
        this.storeRepository = storeRepository;
        this.storeOrderRepository = storeOrderRepository;
        this.ecosystemOrderRepository = ecosystemOrderRepository;
        this.paymentIntentRepository = paymentIntentRepository;
        this.paymentProviderRegistry = paymentProviderRegistry;
        this.paymentOperationalMetrics = paymentOperationalMetrics;
        this.mercadoPagoPublicBaseUrl = mercadoPagoPublicBaseUrl == null ? "" : mercadoPagoPublicBaseUrl.trim();
    }

    public PaymentIntent initiateStorePayment(UUID orderId, String provider, String returnUrl) {
        boolean success = false;
        try {
            PaymentIntent intent = doInitiateStorePayment(orderId, provider, returnUrl);
            success = true;
            return intent;
        } finally {
            paymentOperationalMetrics.recordPaymentInitiation(
                    PaymentScope.STORE,
                    provider,
                    success ? "success" : "failure"
            );
        }
    }

    private PaymentIntent doInitiateStorePayment(UUID orderId, String provider, String returnUrl) {
        UUID storeId = resolveStoreId();

        if (orderId == null || provider == null || provider.isBlank() || returnUrl == null || returnUrl.isBlank()) {
            throw new ResponseStatusException(BAD_REQUEST, "bad_request");
        }

        StoreOrder order = storeOrderRepository.findById(orderId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "order_not_found"));

        if (!order.getStoreId().equals(storeId)) {
            throw new ResponseStatusException(NOT_FOUND, "order_not_found");
        }

        if (order.getStatus() != StoreOrderStatus.PENDING_PAYMENT) {
            throw new ResponseStatusException(CONFLICT, "order_not_payable");
        }

        String normalizedProvider = PaymentProviderRegistry.normalize(provider);
        PaymentProviderClient providerClient = paymentProviderRegistry.find(normalizedProvider)
                .orElseThrow(() -> new ResponseStatusException(SERVICE_UNAVAILABLE, "payment_provider_unavailable"));

        Optional<PaymentIntent> existing = paymentIntentRepository
                .findFirstByScopeAndStoreOrderIdAndProviderAndStatus(
                        PaymentScope.STORE,
                        orderId,
                        normalizedProvider,
                        PaymentStatus.PENDING
                );
        if (existing.isPresent()) {
            return existing.get();
        }

        UUID intentId = UUID.randomUUID();
        Map<String, Object> metadata = Map.of(
                "intentId", intentId,
                "scope", PaymentScope.STORE.name(),
                "storeOrderId", order.getId(),
                "storeId", storeId
        );

        PaymentProviderClient.CheckoutResponse checkout = requireCheckout(providerClient.createCheckout(
                new PaymentProviderClient.CheckoutRequest(
                        intentId,
                        PaymentScope.STORE,
                        order.getId(),
                        null,
                        storeId,
                        null,
                        order.getTotalAmount(),
                        order.getCurrency(),
                        returnUrl,
                        resolveNotificationUrl(PaymentScope.STORE),
                        buildExternalReference(PaymentScope.STORE, order.getId()),
                        metadata
                )
        ));
        log.info("payment_initiation_created request_id={} scope=STORE store_id={} order_id={} provider={}",
                MDC.get("requestId"), storeId, order.getId(), normalizedProvider);

        PaymentIntent intent = new PaymentIntent(
                intentId,
                PaymentScope.STORE,
                order.getId(),
                storeId,
                null,
                null,
                normalizedProvider,
                PaymentStatus.PENDING,
                order.getTotalAmount(),
                order.getCurrency(),
                checkout.providerPreferenceId(),
                checkout.checkoutUrl()
        );

        return saveOrLoadPending(intent, PaymentScope.STORE, order.getId(), normalizedProvider);
    }

    public PaymentIntent initiateEcosystemPayment(UUID ecosystemId, UUID orderId, String provider, String returnUrl) {
        boolean success = false;
        try {
            PaymentIntent intent = doInitiateEcosystemPayment(ecosystemId, orderId, provider, returnUrl);
            success = true;
            return intent;
        } finally {
            paymentOperationalMetrics.recordPaymentInitiation(
                    PaymentScope.ECOSYSTEM,
                    provider,
                    success ? "success" : "failure"
            );
        }
    }

    private PaymentIntent doInitiateEcosystemPayment(UUID ecosystemId, UUID orderId, String provider, String returnUrl) {
        if (ecosystemId == null) {
            throw new ResponseStatusException(BAD_REQUEST, "ecosystem_id_required");
        }
        if (orderId == null || provider == null || provider.isBlank() || returnUrl == null || returnUrl.isBlank()) {
            throw new ResponseStatusException(BAD_REQUEST, "bad_request");
        }

        EcosystemOrder order = ecosystemOrderRepository.findById(orderId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "ecosystem_order_not_found"));

        Ecosystem ecosystem = order.getEcosystem();
        if (ecosystem == null || !ecosystem.getId().equals(ecosystemId)) {
            throw new ResponseStatusException(NOT_FOUND, "ecosystem_order_not_found");
        }

        if (order.getStatus() != EcosystemOrderStatus.PENDING_PAYMENT) {
            throw new ResponseStatusException(CONFLICT, "order_not_payable");
        }

        String normalizedProvider = PaymentProviderRegistry.normalize(provider);
        PaymentProviderClient providerClient = paymentProviderRegistry.find(normalizedProvider)
                .orElseThrow(() -> new ResponseStatusException(SERVICE_UNAVAILABLE, "payment_provider_unavailable"));

        Optional<PaymentIntent> existing = paymentIntentRepository
                .findFirstByScopeAndEcosystemOrderIdAndProviderAndStatus(
                        PaymentScope.ECOSYSTEM,
                        orderId,
                        normalizedProvider,
                        PaymentStatus.PENDING
                );
        if (existing.isPresent()) {
            return existing.get();
        }

        UUID intentId = UUID.randomUUID();
        Map<String, Object> metadata = Map.of(
                "intentId", intentId,
                "scope", PaymentScope.ECOSYSTEM.name(),
                "ecosystemOrderId", order.getId(),
                "ecosystemId", ecosystemId
        );

        PaymentProviderClient.CheckoutResponse checkout = requireCheckout(providerClient.createCheckout(
                new PaymentProviderClient.CheckoutRequest(
                        intentId,
                        PaymentScope.ECOSYSTEM,
                        null,
                        order.getId(),
                        null,
                        ecosystemId,
                        order.getTotalAmount(),
                        order.getCurrency(),
                        returnUrl,
                        resolveNotificationUrl(PaymentScope.ECOSYSTEM),
                        buildExternalReference(PaymentScope.ECOSYSTEM, order.getId()),
                        metadata
                )
        ));
        log.info("payment_initiation_created request_id={} scope=ECOSYSTEM ecosystem_id={} order_id={} provider={}",
                MDC.get("requestId"), ecosystemId, order.getId(), normalizedProvider);

        PaymentIntent intent = new PaymentIntent(
                intentId,
                PaymentScope.ECOSYSTEM,
                null,                // storeOrderId
                null,                // storeId
                order.getId(),       // ecosystemOrderId
                ecosystemId,         // ecosystemId
                normalizedProvider,
                PaymentStatus.PENDING,
                order.getTotalAmount(),
                order.getCurrency(),
                checkout.providerPreferenceId(),
                checkout.checkoutUrl()
        );

        return saveOrLoadPending(intent, PaymentScope.ECOSYSTEM, order.getId(), normalizedProvider);
    }

    private PaymentIntent saveOrLoadPending(
            PaymentIntent intent,
            PaymentScope scope,
            UUID orderId,
            String provider
    ) {
        try {
            return paymentIntentRepository.save(intent);
        } catch (DataIntegrityViolationException ex) {
            Optional<PaymentIntent> existing = scope == PaymentScope.STORE
                    ? paymentIntentRepository.findFirstByScopeAndStoreOrderIdAndProviderAndStatus(
                            scope,
                            orderId,
                            provider,
                            PaymentStatus.PENDING
                    )
                    : paymentIntentRepository.findFirstByScopeAndEcosystemOrderIdAndProviderAndStatus(
                            scope,
                            orderId,
                            provider,
                            PaymentStatus.PENDING
                    );
            if (existing.isPresent()) {
                return existing.get();
            }
            throw ex;
        }
    }

    private PaymentProviderClient.CheckoutResponse requireCheckout(PaymentProviderClient.CheckoutResponse checkout) {
        if (checkout == null || checkout.checkoutUrl() == null || checkout.checkoutUrl().isBlank()) {
            log.warn("checkout_failure category=api_error_vendor_timeout request_id={} failure_reason=payment_provider_unavailable", MDC.get("requestId"));
            throw new ResponseStatusException(SERVICE_UNAVAILABLE, "payment_provider_unavailable");
        }
        return checkout;
    }

    private UUID resolveStoreId() {
        String storeSlug = TenantContext.getStoreSlug();
        if (storeSlug == null || storeSlug.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "store_context_required");
        }

        Store store = storeRepository.findBySlug(storeSlug)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "store_not_found"));

        if (!store.isActive()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "store_not_found");
        }

        return store.getId();
    }

    private String resolveNotificationUrl(PaymentScope scope) {
        if (mercadoPagoPublicBaseUrl.isBlank()) {
            return "";
        }
        String base = mercadoPagoPublicBaseUrl.endsWith("/")
                ? mercadoPagoPublicBaseUrl.substring(0, mercadoPagoPublicBaseUrl.length() - 1)
                : mercadoPagoPublicBaseUrl;
        return switch (scope) {
            case STORE -> base + "/api/webhooks/mercadopago?source_news=webhooks";
            case ECOSYSTEM -> base + "/api/payments/mercadopago/ecosystem/webhook?source_news=webhooks";
            default -> "";
        };
    }

    private String buildExternalReference(PaymentScope scope, UUID orderId) {
        return scope.name() + ":" + orderId;
    }
}
