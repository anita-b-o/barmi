package com.barmi.app.payments;

import com.barmi.app.fulfillment.CreateFulfillmentForPaidOrderService;
import com.barmi.domain.enums.PaymentScope;
import com.barmi.domain.events.OutboxEvent;
import com.barmi.domain.events.ProcessedEvent;
import com.barmi.domain.orders.StoreOrder;
import com.barmi.domain.orders.StoreOrderStatus;
import com.barmi.domain.payments.Payment;
import com.barmi.domain.payments.PaymentStatus;
import com.barmi.infra.repo.OutboxEventRepository;
import com.barmi.infra.repo.PaymentRepository;
import com.barmi.infra.repo.ProcessedEventRepository;
import com.barmi.infra.repo.StoreOrderRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import jakarta.transaction.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;

import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.NOT_FOUND;

@Service
public class StorePaymentConfirmationService {
    private static final String PROVIDER = "MERCADOPAGO";
    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final Logger log = LoggerFactory.getLogger(StorePaymentConfirmationService.class);

    private final ProcessedEventRepository processedEventRepository;
    private final PaymentRepository paymentRepository;
    private final StoreOrderRepository storeOrderRepository;
    private final OutboxEventRepository outboxEventRepository;
    private final CreateFulfillmentForPaidOrderService createFulfillmentForPaidOrderService;
    private final Counter paymentsConfirmedCounter;
    private final Counter paymentsMismatchCounter;

    public StorePaymentConfirmationService(
            ProcessedEventRepository processedEventRepository,
            PaymentRepository paymentRepository,
            StoreOrderRepository storeOrderRepository,
            OutboxEventRepository outboxEventRepository,
            CreateFulfillmentForPaidOrderService createFulfillmentForPaidOrderService,
            MeterRegistry meterRegistry
    ) {
        this.processedEventRepository = processedEventRepository;
        this.paymentRepository = paymentRepository;
        this.storeOrderRepository = storeOrderRepository;
        this.outboxEventRepository = outboxEventRepository;
        this.createFulfillmentForPaidOrderService = createFulfillmentForPaidOrderService;
        this.paymentsConfirmedCounter = meterRegistry.counter("barmi_payments_confirmed_total", "scope", "STORE");
        this.paymentsMismatchCounter = meterRegistry.counter("barmi_payments_mismatch_total", "scope", "STORE");
    }

    @Transactional
    public void confirmStorePayment(
            UUID webhookEventId,
            UUID storeOrderId,
            String providerPaymentId,
            BigDecimal amount,
            String currency
    ) {
        if (webhookEventId == null) throw new ResponseStatusException(BAD_REQUEST, "missing_event_id");
        if (storeOrderId == null) throw new ResponseStatusException(BAD_REQUEST, "missing_store_order_id");
        if (providerPaymentId == null || providerPaymentId.isBlank()) {
            throw new ResponseStatusException(BAD_REQUEST, "missing_provider_payment_id");
        }
        if (amount == null || amount.compareTo(BigDecimal.ZERO) < 0) {
            throw new ResponseStatusException(BAD_REQUEST, "invalid_amount");
        }
        if (currency == null || currency.isBlank()) {
            throw new ResponseStatusException(BAD_REQUEST, "missing_currency");
        }

        if (processedEventRepository.existsById(webhookEventId)) {
            return;
        }

        if (paymentRepository.existsByScopeAndOperationIdAndStatus(PaymentScope.STORE, storeOrderId, PaymentStatus.CONFIRMED)) {
            saveProcessedEvent(webhookEventId);
            return;
        }

        StoreOrder order = storeOrderRepository.findById(storeOrderId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "store_order_not_found"));

        Payment payment = paymentRepository.findByProviderAndProviderPaymentId(PROVIDER, providerPaymentId)
                .orElseGet(() -> new Payment(
                        UUID.randomUUID(),
                        PaymentScope.STORE,
                        storeOrderId,
                        PROVIDER,
                        providerPaymentId,
                        PaymentStatus.PENDING,
                        amount,
                        currency
                ));

        if (payment.getStatus() != PaymentStatus.CONFIRMED) {
            payment.markConfirmed();
            try {
                paymentRepository.save(payment);
                paymentsConfirmedCounter.increment();
                log.info("payment_confirmed scope=STORE operation_id={} provider_payment_id={}", storeOrderId, providerPaymentId);
            } catch (DataIntegrityViolationException ex) {
                if (paymentRepository.findFirstByScopeAndOperationIdAndStatus(
                        PaymentScope.STORE,
                        storeOrderId,
                        PaymentStatus.CONFIRMED
                ).isPresent()) {
                    log.info("payment_confirm_noop_race scope=STORE operation_id={} provider_payment_id={}", storeOrderId, providerPaymentId);
                    saveProcessedEvent(webhookEventId);
                    return;
                }
                throw ex;
            }
        }

        if (!currency.equals(order.getCurrency()) || amount.compareTo(order.getTotalAmount()) != 0) {
            Map<String, Object> payload = Map.of(
                    "storeOrderId", order.getId(),
                    "storeId", order.getStoreId(),
                    "providerPaymentId", providerPaymentId,
                    "received", Map.of(
                            "amount", amount,
                            "currency", currency
                    ),
                    "expected", Map.of(
                            "amount", order.getTotalAmount(),
                            "currency", order.getCurrency()
                    )
            );

            OutboxEvent event = new OutboxEvent(
                    UUID.randomUUID(),
                    "STORE_ORDER_PAYMENT_MISMATCH",
                    PaymentScope.STORE.name(),
                    order.getId(),
                    toJson(payload)
            );
            outboxEventRepository.save(event);
            paymentsMismatchCounter.increment();
            log.warn("payment_mismatch scope=STORE operation_id={} provider_payment_id={} received_amount={} received_currency={} expected_amount={} expected_currency={}", order.getId(), providerPaymentId, amount, currency, order.getTotalAmount(), order.getCurrency());
            saveProcessedEvent(webhookEventId);
            return;
        }

        boolean paidNow = false;
        if (order.getStatus() == StoreOrderStatus.PENDING_PAYMENT) {
            order.markPaid();
            storeOrderRepository.save(order);
            paidNow = true;
        }

        Map<String, Object> payload = Map.of(
                "storeOrderId", order.getId(),
                "storeId", order.getStoreId(),
                "paymentId", providerPaymentId,
                "amount", amount,
                "currency", currency
        );

        OutboxEvent event = new OutboxEvent(
                UUID.randomUUID(),
                "STORE_ORDER_PAID",
                PaymentScope.STORE.name(),
                order.getId(),
                toJson(payload)
        );
        outboxEventRepository.save(event);

        if (paidNow) {
            createFulfillmentForPaidOrderService.createForPaidOrder(order);
        }
        saveProcessedEvent(webhookEventId);
    }

    private void saveProcessedEvent(UUID webhookEventId) {
        try {
            processedEventRepository.save(new ProcessedEvent(webhookEventId));
        } catch (DataIntegrityViolationException ex) {
            if (processedEventRepository.existsById(webhookEventId)) {
                return;
            }
            throw ex;
        }
    }

    private static String toJson(Object value) {
        try {
            return MAPPER.writeValueAsString(value);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("json_encode_failed", e);
        }
    }
}
