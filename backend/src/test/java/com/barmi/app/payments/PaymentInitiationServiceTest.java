package com.barmi.app.payments;

import com.barmi.app.tenant.TenantContext;
import com.barmi.domain.ecosystem.Ecosystem;
import com.barmi.domain.enums.PaymentScope;
import com.barmi.domain.orders.EcosystemOrder;
import com.barmi.domain.orders.EcosystemOrderItem;
import com.barmi.domain.orders.StoreOrder;
import com.barmi.domain.orders.StoreOrderItem;
import com.barmi.domain.payments.PaymentIntent;
import com.barmi.domain.payments.PaymentStatus;
import com.barmi.domain.store.Store;
import com.barmi.infra.repo.EcosystemOrderRepository;
import com.barmi.infra.repo.PaymentIntentRepository;
import com.barmi.infra.repo.StoreOrderRepository;
import com.barmi.infra.repo.StoreRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PaymentInitiationServiceTest {

    @Mock
    private StoreRepository storeRepository;

    @Mock
    private StoreOrderRepository storeOrderRepository;

    @Mock
    private EcosystemOrderRepository ecosystemOrderRepository;

    @Mock
    private PaymentIntentRepository paymentIntentRepository;

    @Mock
    private PaymentProviderRegistry paymentProviderRegistry;

    @Mock
    private PaymentProviderClient paymentProviderClient;

    @InjectMocks
    private PaymentInitiationService paymentInitiationService;

    @AfterEach
    void clearTenantContext() {
        TenantContext.clear();
    }

    @Test
    void storeInitiationCreatesIntentWithCheckoutUrl() {
        UUID storeId = UUID.randomUUID();
        UUID orderId = UUID.randomUUID();
        Store store = new Store(storeId, "demo", "Demo");

        TenantContext.setStoreSlug("demo");
        when(storeRepository.findBySlug("demo")).thenReturn(Optional.of(store));

        StoreOrder order = buildStoreOrder(orderId, storeId);
        when(storeOrderRepository.findById(orderId)).thenReturn(Optional.of(order));
        when(paymentIntentRepository.findFirstByScopeAndStoreOrderIdAndProviderAndStatus(
                PaymentScope.STORE,
                orderId,
                "MERCADOPAGO",
                PaymentStatus.PENDING
        )).thenReturn(Optional.empty());

        when(paymentProviderRegistry.find("MERCADOPAGO")).thenReturn(Optional.of(paymentProviderClient));
        when(paymentProviderClient.createCheckout(any()))
                .thenReturn(new PaymentProviderClient.CheckoutResponse("https://checkout.example/abc", "pref-1"));

        when(paymentIntentRepository.save(any(PaymentIntent.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        PaymentIntent intent = paymentInitiationService.initiateStorePayment(
                orderId,
                "MERCADOPAGO",
                "https://return.example"
        );

        assertThat(intent.getCheckoutUrl()).isEqualTo("https://checkout.example/abc");
        assertThat(intent.getProviderPreferenceId()).isEqualTo("pref-1");
        assertThat(intent.getStatus()).isEqualTo(PaymentStatus.PENDING);
        assertThat(intent.getScope()).isEqualTo(PaymentScope.STORE);

        ArgumentCaptor<PaymentProviderClient.CheckoutRequest> captor = ArgumentCaptor.forClass(
                PaymentProviderClient.CheckoutRequest.class
        );
        verify(paymentProviderClient).createCheckout(captor.capture());
        assertThat(captor.getValue().metadata()).containsEntry("storeOrderId", orderId);
        assertThat(captor.getValue().metadata()).containsEntry("storeId", storeId);
    }

    @Test
    void storeInitiationRejectsNonPayableOrder() {
        UUID storeId = UUID.randomUUID();
        UUID orderId = UUID.randomUUID();
        Store store = new Store(storeId, "demo", "Demo");
        TenantContext.setStoreSlug("demo");
        when(storeRepository.findBySlug("demo")).thenReturn(Optional.of(store));

        StoreOrder order = buildStoreOrder(orderId, storeId);
        order.markPaid();
        when(storeOrderRepository.findById(orderId)).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> paymentInitiationService.initiateStorePayment(
                orderId,
                "MERCADOPAGO",
                "https://return.example"
        ))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> {
                    ResponseStatusException rse = (ResponseStatusException) ex;
                    assertThat(rse.getStatusCode().value()).isEqualTo(409);
                    assertThat(rse.getReason()).isEqualTo("order_not_payable");
                });
    }

    @Test
    void storeInitiationRequiresStoreContext() {
        UUID orderId = UUID.randomUUID();

        assertThatThrownBy(() -> paymentInitiationService.initiateStorePayment(
                orderId,
                "MERCADOPAGO",
                "https://return.example"
        ))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> {
                    ResponseStatusException rse = (ResponseStatusException) ex;
                    assertThat(rse.getStatusCode().value()).isEqualTo(400);
                    assertThat(rse.getReason()).isEqualTo("store_context_required");
                });
    }

    @Test
    void storeInitiationReturnsNotFoundForMissingOrder() {
        UUID storeId = UUID.randomUUID();
        UUID orderId = UUID.randomUUID();
        Store store = new Store(storeId, "demo", "Demo");
        TenantContext.setStoreSlug("demo");
        when(storeRepository.findBySlug("demo")).thenReturn(Optional.of(store));
        when(storeOrderRepository.findById(orderId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> paymentInitiationService.initiateStorePayment(
                orderId,
                "MERCADOPAGO",
                "https://return.example"
        ))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> {
                    ResponseStatusException rse = (ResponseStatusException) ex;
                    assertThat(rse.getStatusCode().value()).isEqualTo(404);
                    assertThat(rse.getReason()).isEqualTo("order_not_found");
                });
    }

    @Test
    void storeInitiationReturnsProviderUnavailable() {
        UUID storeId = UUID.randomUUID();
        UUID orderId = UUID.randomUUID();
        Store store = new Store(storeId, "demo", "Demo");
        TenantContext.setStoreSlug("demo");
        when(storeRepository.findBySlug("demo")).thenReturn(Optional.of(store));

        StoreOrder order = buildStoreOrder(orderId, storeId);
        when(storeOrderRepository.findById(orderId)).thenReturn(Optional.of(order));
        when(paymentProviderRegistry.find("MERCADOPAGO")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> paymentInitiationService.initiateStorePayment(
                orderId,
                "MERCADOPAGO",
                "https://return.example"
        ))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> {
                    ResponseStatusException rse = (ResponseStatusException) ex;
                    assertThat(rse.getStatusCode().value()).isEqualTo(503);
                    assertThat(rse.getReason()).isEqualTo("payment_provider_unavailable");
                });
    }

    @Test
    void ecosystemInitiationRequiresEcosystemId() {
        UUID orderId = UUID.randomUUID();

        assertThatThrownBy(() -> paymentInitiationService.initiateEcosystemPayment(
                null,
                orderId,
                "MERCADOPAGO",
                "https://return.example"
        ))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> {
                    ResponseStatusException rse = (ResponseStatusException) ex;
                    assertThat(rse.getStatusCode().value()).isEqualTo(400);
                    assertThat(rse.getReason()).isEqualTo("ecosystem_id_required");
                });
    }

    @Test
    void ecosystemInitiationRejectsOrderFromAnotherEcosystem() {
        UUID ecosystemId = UUID.randomUUID();
        UUID otherEcosystemId = UUID.randomUUID();
        Ecosystem ecosystem = new Ecosystem(otherEcosystemId, "Eco", "eco");
        EcosystemOrder order = buildEcosystemOrder(UUID.randomUUID(), ecosystem);

        when(ecosystemOrderRepository.findById(order.getId())).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> paymentInitiationService.initiateEcosystemPayment(
                ecosystemId,
                order.getId(),
                "MERCADOPAGO",
                "https://return.example"
        ))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> {
                    ResponseStatusException rse = (ResponseStatusException) ex;
                    assertThat(rse.getStatusCode().value()).isEqualTo(404);
                    assertThat(rse.getReason()).isEqualTo("ecosystem_order_not_found");
                });
    }

    @Test
    void ecosystemInitiationReturnsNotFoundForMissingOrder() {
        UUID ecosystemId = UUID.randomUUID();
        UUID orderId = UUID.randomUUID();
        when(ecosystemOrderRepository.findById(orderId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> paymentInitiationService.initiateEcosystemPayment(
                ecosystemId,
                orderId,
                "MERCADOPAGO",
                "https://return.example"
        ))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> {
                    ResponseStatusException rse = (ResponseStatusException) ex;
                    assertThat(rse.getStatusCode().value()).isEqualTo(404);
                    assertThat(rse.getReason()).isEqualTo("ecosystem_order_not_found");
                });
    }

    private StoreOrder buildStoreOrder(UUID orderId, UUID storeId) {
        StoreOrderItem item = new StoreOrderItem(
                UUID.randomUUID(),
                orderId,
                UUID.randomUUID(),
                1,
                new BigDecimal("100.00"),
                new BigDecimal("100.00"),
                "ARS",
                "{\"name\":\"Item\"}"
        );

        return StoreOrder.create(
                orderId,
                storeId,
                "ARS",
                new BigDecimal("100.00"),
                new BigDecimal("100.00"),
                BigDecimal.ZERO,
                "",
                null,
                null,
                List.of(item)
        );
    }

    private EcosystemOrder buildEcosystemOrder(UUID orderId, Ecosystem ecosystem) {
        EcosystemOrderItem item = new EcosystemOrderItem(
                UUID.randomUUID(),
                UUID.randomUUID(),
                1,
                new BigDecimal("150.00"),
                new BigDecimal("150.00"),
                "{\"name\":\"Item\",\"currency\":\"ARS\"}"
        );

        return EcosystemOrder.create(
                orderId,
                ecosystem,
                "ARS",
                new BigDecimal("150.00"),
                BigDecimal.ZERO,
                "",
                null,
                null,
                new BigDecimal("150.00"),
                List.of(item)
        );
    }
}
