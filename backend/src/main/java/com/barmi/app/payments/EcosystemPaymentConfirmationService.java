package com.barmi.app.payments;

import com.barmi.domain.enums.PaymentScope;
import com.barmi.domain.events.OutboxEvent;
import com.barmi.domain.events.ProcessedEvent;
import com.barmi.domain.orders.EcosystemOrder;
import com.barmi.domain.orders.EcosystemOrderStatus;
import com.barmi.domain.payments.Payment;
import com.barmi.domain.payments.PaymentStatus;
import com.barmi.infra.repo.EcosystemOrderRepository;
import com.barmi.infra.repo.OutboxEventRepository;
import com.barmi.infra.repo.PaymentRepository;
import com.barmi.infra.repo.ProcessedEventRepository;
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
import static org.springframework.http.HttpStatus.CONFLICT;
import static org.springframework.http.HttpStatus.NOT_FOUND;

@Service
    public class EcosystemPaymentConfirmationService {
    private static final String PROVIDER = "MERCADOPAGO";
    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final Logger log = LoggerFactory.getLogger(EcosystemPaymentConfirmationService.class);

    private final ProcessedEventRepository processedEventRepository;
    private final PaymentRepository paymentRepository;
    private final EcosystemOrderRepository ecosystemOrderRepository;
    private final OutboxEventRepository outboxEventRepository;
    private final Counter paymentsConfirmedCounter;
    private final Counter paymentsMismatchCounter;

    public EcosystemPaymentConfirmationService(
            ProcessedEventRepository processedEventRepository,
            PaymentRepository paymentRepository,
            EcosystemOrderRepository ecosystemOrderRepository,
            OutboxEventRepository outboxEventRepository,
            MeterRegistry meterRegistry
    ) {
        this.processedEventRepository = processedEventRepository;
        this.paymentRepository = paymentRepository;
        this.ecosystemOrderRepository = ecosystemOrderRepository;
        this.outboxEventRepository = outboxEventRepository;
        this.paymentsConfirmedCounter = meterRegistry.counter("barmi_payments_confirmed_total", "scope", "ECOSYSTEM");
        this.paymentsMismatchCounter = meterRegistry.counter("barmi_payments_mismatch_total", "scope", "ECOSYSTEM");
    }

    @Transactional
    public void confirmEcosystemPayment(
            UUID webhookEventId,
            UUID ecosystemOrderId,
            String providerPaymentId,
            BigDecimal amount,
            String currency
    ) {
        if (webhookEventId == null) throw new ResponseStatusException(BAD_REQUEST, "missing_event_id");
        if (ecosystemOrderId == null) throw new ResponseStatusException(BAD_REQUEST, "missing_ecosystem_order_id");
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

        EcosystemOrder order = ecosystemOrderRepository.findById(ecosystemOrderId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "ecosystem_order_not_found"));

        if (order.getStatus() == EcosystemOrderStatus.PAID) {
            saveProcessedEvent(webhookEventId);
            return;
        }

        Payment existingByProvider = paymentRepository.findByProviderAndProviderPaymentId(PROVIDER, providerPaymentId)
                .orElse(null);

        if (existingByProvider != null) {
            if (existingByProvider.getScope() != PaymentScope.ECOSYSTEM
                    || !existingByProvider.getOperationId().equals(ecosystemOrderId)) {
                throw new ResponseStatusException(CONFLICT, "provider_payment_id_conflict");
            }
            if (existingByProvider.getStatus() == PaymentStatus.CONFIRMED) {
                saveProcessedEvent(webhookEventId);
                return;
            }
        }

        if (paymentRepository.existsByScopeAndOperationIdAndStatus(PaymentScope.ECOSYSTEM, ecosystemOrderId, PaymentStatus.CONFIRMED)) {
            saveProcessedEvent(webhookEventId);
            return;
        }

        boolean mismatch = !currency.equals(order.getCurrency())
                || amount.compareTo(order.getTotalAmount()) != 0;

        Payment payment = existingByProvider == null
                ? new Payment(
                        UUID.randomUUID(),
                        PaymentScope.ECOSYSTEM,
                        ecosystemOrderId,
                        PROVIDER,
                        providerPaymentId,
                        PaymentStatus.PENDING,
                        amount,
                        currency
                )
                : existingByProvider;

        if (payment.getStatus() != PaymentStatus.CONFIRMED) {
            payment.markConfirmed();
            try {
                paymentRepository.save(payment);
                paymentsConfirmedCounter.increment();
                log.info("payment_confirmed scope=ECOSYSTEM operation_id={} provider_payment_id={}", ecosystemOrderId, providerPaymentId);
            } catch (DataIntegrityViolationException ex) {
                if (paymentRepository.findFirstByScopeAndOperationIdAndStatus(
                        PaymentScope.ECOSYSTEM,
                        ecosystemOrderId,
                        PaymentStatus.CONFIRMED
                ).isPresent()) {
                    log.info("payment_confirm_noop_race scope=ECOSYSTEM operation_id={} provider_payment_id={}", ecosystemOrderId, providerPaymentId);
                    saveProcessedEvent(webhookEventId);
                    return;
                }
                Payment reloaded = paymentRepository.findByProviderAndProviderPaymentId(PROVIDER, providerPaymentId)
                        .orElseThrow(() -> ex);
                if (reloaded.getScope() != PaymentScope.ECOSYSTEM
                        || !reloaded.getOperationId().equals(ecosystemOrderId)) {
                    throw new ResponseStatusException(CONFLICT, "provider_payment_id_conflict");
                }
                if (reloaded.getStatus() == PaymentStatus.CONFIRMED) {
                    saveProcessedEvent(webhookEventId);
                    return;
                }
                throw ex;
            }
        }

        if (mismatch) {
            Map<String, Object> payload = Map.of(
                    "ecosystemOrderId", order.getId(),
                    "ecosystemId", order.getEcosystem().getId(),
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
                    "ECOSYSTEM_ORDER_PAYMENT_MISMATCH",
                    PaymentScope.ECOSYSTEM.name(),
                    order.getId(),
                    toJson(payload)
            );
            outboxEventRepository.save(event);
            paymentsMismatchCounter.increment();
            log.warn("payment_mismatch scope=ECOSYSTEM operation_id={} provider_payment_id={} received_amount={} received_currency={} expected_amount={} expected_currency={}", order.getId(), providerPaymentId, amount, currency, order.getTotalAmount(), order.getCurrency());
            saveProcessedEvent(webhookEventId);
            return;
        }

        order.markPaid();
        ecosystemOrderRepository.save(order);

        Map<String, Object> payload = Map.of(
                "ecosystemOrderId", order.getId(),
                "ecosystemId", order.getEcosystem().getId(),
                "paymentId", providerPaymentId,
                "amount", amount,
                "currency", currency
        );

        OutboxEvent event = new OutboxEvent(
                UUID.randomUUID(),
                "ECOSYSTEM_ORDER_PAID",
                PaymentScope.ECOSYSTEM.name(),
                order.getId(),
                toJson(payload)
        );
        outboxEventRepository.save(event);
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
