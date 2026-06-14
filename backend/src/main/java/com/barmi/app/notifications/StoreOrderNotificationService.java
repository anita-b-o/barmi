package com.barmi.app.notifications;

import com.barmi.domain.events.OutboxEvent;
import com.barmi.domain.notifications.NotificationEmailDelivery;
import com.barmi.domain.orders.StoreOrder;
import com.barmi.domain.store.Store;
import com.barmi.domain.store.StoreMember;
import com.barmi.domain.store.StoreMemberRole;
import com.barmi.domain.store.StoreMemberStatus;
import com.barmi.infra.repo.NotificationEmailDeliveryRepository;
import com.barmi.infra.repo.OutboxEventRepository;
import com.barmi.infra.repo.StoreMemberRepository;
import com.barmi.infra.repo.StoreOrderRepository;
import com.barmi.infra.repo.StoreRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
public class StoreOrderNotificationService {
    private static final Logger log = LoggerFactory.getLogger(StoreOrderNotificationService.class);
    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final String STORE_ORDER_CREATED = "STORE_ORDER_CREATED";
    private static final String STORE_ORDER_PAID = "STORE_ORDER_PAID";
    private static final String STORE_ORDER_MANUALLY_CANCELLED = "STORE_ORDER_MANUALLY_CANCELLED";
    private static final String STORE_FULFILLMENT_CREATED = "STORE_FULFILLMENT_CREATED";
    private static final String STORE_FULFILLMENT_STATUS_CHANGED = "STORE_FULFILLMENT_STATUS_CHANGED";
    private static final String TEMPLATE_BUYER_ORDER_CREATED = "buyer_order_created";
    private static final String TEMPLATE_BUYER_PAYMENT_CONFIRMED = "buyer_payment_confirmed";
    private static final String TEMPLATE_BUYER_ORDER_CANCELLED = "buyer_order_cancelled";
    private static final String TEMPLATE_BUYER_FULFILLMENT_STARTED = "buyer_fulfillment_started";
    private static final String TEMPLATE_BUYER_FULFILLMENT_DELIVERED = "buyer_fulfillment_delivered";
    private static final String TEMPLATE_ADMIN_NEW_PAID_ORDER = "admin_new_paid_order";
    private static final String RESULT_SENT = "sent";
    private static final String RESULT_SKIPPED_DUPLICATE = "skipped_duplicate";
    private static final String RESULT_SKIPPED_INVALID_RECIPIENT = "skipped_invalid_recipient";
    private static final String RESULT_FAILURE = "failure";
    private final NotificationEmailSender emailSender;
    private final NotificationEmailDeliveryRepository notificationEmailDeliveryRepository;
    private final OutboxEventRepository outboxEventRepository;
    private final StoreOrderRepository storeOrderRepository;
    private final StoreRepository storeRepository;
    private final StoreMemberRepository storeMemberRepository;
    private final MeterRegistry meterRegistry;
    private final String emailMode;
    private final String publicScheme;
    private final String baseDomain;

    public StoreOrderNotificationService(
            NotificationEmailSender emailSender,
            NotificationEmailDeliveryRepository notificationEmailDeliveryRepository,
            OutboxEventRepository outboxEventRepository,
            StoreOrderRepository storeOrderRepository,
            StoreRepository storeRepository,
            StoreMemberRepository storeMemberRepository,
            MeterRegistry meterRegistry,
            @Value("${app.notifications.email.mode:logging}") String emailMode,
            @Value("${app.notifications.storePublicScheme:https}") String publicScheme,
            @Value("${app.tenant.baseDomain}") String baseDomain
    ) {
        this.emailSender = emailSender;
        this.notificationEmailDeliveryRepository = notificationEmailDeliveryRepository;
        this.outboxEventRepository = outboxEventRepository;
        this.storeOrderRepository = storeOrderRepository;
        this.storeRepository = storeRepository;
        this.storeMemberRepository = storeMemberRepository;
        this.meterRegistry = meterRegistry;
        this.emailMode = normalizeMode(emailMode);
        this.publicScheme = publicScheme;
        this.baseDomain = baseDomain;
    }

    public void handle(OutboxEvent event) {
        if (event == null || !"STORE".equals(event.getScope())) {
            return;
        }

        switch (event.getEventType()) {
            case STORE_ORDER_CREATED -> notifyOrderCreated(event);
            case STORE_ORDER_PAID -> notifyPaymentConfirmed(event);
            case STORE_ORDER_MANUALLY_CANCELLED -> notifyOrderCancelled(event);
            case STORE_FULFILLMENT_CREATED -> notifyFulfillmentStarted(event);
            case STORE_FULFILLMENT_STATUS_CHANGED -> notifyFulfillmentDelivered(event);
            default -> {
                return;
            }
        }
    }

    private void notifyOrderCreated(OutboxEvent event) {
        UUID orderId = event.getAggregateId();
        String recipient = findNotificationEmail(orderId).orElse(null);
        if (recipient == null || orderId == null) {
            return;
        }

        StoreOrder order = findOrder(orderId);
        Store store = findStore(order.getStoreId());
        String subject = "[" + store.getName() + "] Orden creada " + order.getId();
        String body = """
                Tu orden fue creada correctamente.

                Orden: %s
                Estado: pendiente de pago
                Total: %s
                Seguimiento: %s

                Te vamos a avisar cuando haya cambios relevantes en el pago o la entrega.
                """.formatted(
                order.getId(),
                money(order.getTotalAmount(), order.getCurrency()),
                buildTrackingLink(store.getSlug(), order.getId())
        );
        sendOnce(event, TEMPLATE_BUYER_ORDER_CREATED, recipient, subject, body);
    }

    private void notifyPaymentConfirmed(OutboxEvent event) {
        UUID orderId = event.getAggregateId();
        if (orderId == null) {
            return;
        }

        String recipient = findNotificationEmail(orderId).orElse(null);
        StoreOrder order = findOrder(orderId);
        Store store = findStore(order.getStoreId());
        if (recipient != null) {
            String subject = "[" + store.getName() + "] Pago confirmado para tu orden " + order.getId();
            String body = """
                    Confirmamos el pago de tu orden.

                    Orden: %s
                    Estado: pagada
                    Total confirmado: %s
                    Seguimiento: %s

                    El siguiente paso es la preparación del pedido.
                    """.formatted(
                    order.getId(),
                    money(order.getTotalAmount(), order.getCurrency()),
                    buildTrackingLink(store.getSlug(), order.getId())
            );
            sendOnce(event, TEMPLATE_BUYER_PAYMENT_CONFIRMED, recipient, subject, body);
        }
        notifyStoreAdminsOfPaidOrder(event, order, store);
    }

    private void notifyStoreAdminsOfPaidOrder(OutboxEvent event, StoreOrder order, Store store) {
        String subject = "[" + store.getName() + "] Nueva orden pagada";
        String body = """
                Recibiste una nueva orden pagada.

                Orden: %s
                Total: %s
                Estado: pagada

                Revisá el panel admin de la tienda para preparar el pedido.
                """.formatted(
                order.getId(),
                money(order.getTotalAmount(), order.getCurrency())
        );

        activeAdminRecipients(order.getStoreId()).forEach(recipient ->
                sendOnce(event, TEMPLATE_ADMIN_NEW_PAID_ORDER, recipient, subject, body)
        );
    }

    private void notifyOrderCancelled(OutboxEvent event) {
        UUID orderId = event.getAggregateId();
        String recipient = findNotificationEmail(orderId).orElse(null);
        if (recipient == null || orderId == null) {
            return;
        }

        StoreOrder order = findOrder(orderId);
        Store store = findStore(order.getStoreId());
        String subject = "[" + store.getName() + "] Orden cancelada " + order.getId();
        String body = """
                Tu orden fue cancelada.

                Orden: %s
                Estado: cancelada
                Seguimiento: %s

                Si necesitás revisar el resumen final, podés abrir el detalle público.
                """.formatted(
                order.getId(),
                buildTrackingLink(store.getSlug(), order.getId())
        );
        sendOnce(event, TEMPLATE_BUYER_ORDER_CANCELLED, recipient, subject, body);
    }

    private void notifyFulfillmentStarted(OutboxEvent event) {
        Map<String, Object> payload = readPayload(event);
        UUID orderId = parseUuid(payload.get("storeOrderId"));
        String recipient = findNotificationEmail(orderId).orElse(null);
        if (recipient == null || orderId == null) {
            return;
        }

        StoreOrder order = findOrder(orderId);
        Store store = findStore(order.getStoreId());
        String subject = "[" + store.getName() + "] Empezamos a preparar tu pedido " + order.getId();
        String body = """
                Tu pedido ya entró en preparación.

                Orden: %s
                Estado de entrega: iniciada
                Seguimiento: %s

                Te vamos a avisar cuando la entrega quede completada.
                """.formatted(
                order.getId(),
                buildTrackingLink(store.getSlug(), order.getId())
        );
        sendOnce(event, TEMPLATE_BUYER_FULFILLMENT_STARTED, recipient, subject, body);
    }

    private void notifyFulfillmentDelivered(OutboxEvent event) {
        Map<String, Object> payload = readPayload(event);
        String status = asString(payload.get("status"));
        if (!"DELIVERED".equals(status)) {
            return;
        }
        UUID orderId = parseUuid(payload.get("storeOrderId"));
        String recipient = findNotificationEmail(orderId).orElse(null);
        if (recipient == null || orderId == null) {
            return;
        }

        StoreOrder order = findOrder(orderId);
        Store store = findStore(order.getStoreId());
        String subject = "[" + store.getName() + "] Entrega completada para tu orden " + order.getId();
        String body = """
                La entrega de tu pedido figura como completada.

                Orden: %s
                Estado de entrega: entregada
                Seguimiento: %s

                Gracias por tu compra.
                """.formatted(
                order.getId(),
                buildTrackingLink(store.getSlug(), order.getId())
        );
        sendOnce(event, TEMPLATE_BUYER_FULFILLMENT_DELIVERED, recipient, subject, body);
    }

    private Optional<String> findNotificationEmail(UUID orderId) {
        if (orderId == null) {
            return Optional.empty();
        }
        Optional<String> persistedBuyerEmail = storeOrderRepository.findById(orderId)
                .map(StoreOrder::getBuyerEmail)
                .flatMap(this::normalizeEmailForDelivery);
        if (persistedBuyerEmail.isPresent()) {
            return persistedBuyerEmail;
        }
        return outboxEventRepository.findFirstByAggregateIdAndEventTypeOrderByOccurredAtDesc(orderId, STORE_ORDER_CREATED)
                .map(this::readPayload)
                .map(payload -> asString(payload.get("notificationEmail")))
                .flatMap(this::normalizeEmailForDelivery);
    }

    private StoreOrder findOrder(UUID orderId) {
        return storeOrderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalStateException("store_order_not_found_for_notification"));
    }

    private Store findStore(UUID storeId) {
        return storeRepository.findById(storeId)
                .orElseThrow(() -> new IllegalStateException("store_not_found_for_notification"));
    }

    private List<String> activeAdminRecipients(UUID storeId) {
        return storeMemberRepository.findAllByStoreIdOrderByCreatedAtAsc(storeId).stream()
                .filter(member -> member.getStatus() == StoreMemberStatus.ACTIVE)
                .filter(member -> member.getRole() == StoreMemberRole.OWNER || member.getRole() == StoreMemberRole.ADMIN)
                .map(StoreMember::getMemberEmail)
                .filter(email -> email != null && !email.isBlank())
                .map(String::trim)
                .distinct()
                .toList();
    }

    private void sendOnce(OutboxEvent event, String template, String recipient, String subject, String body) {
        String metricTemplate = metricTemplate(template);
        String normalizedRecipient = normalizeEmailForDelivery(recipient).orElse(null);
        if (normalizedRecipient == null) {
            recordAttempt(metricTemplate, RESULT_SKIPPED_INVALID_RECIPIENT);
            log.warn("notification_email_delivery template={} result={} mode={} event_id={} order_ref={}",
                    metricTemplate, RESULT_SKIPPED_INVALID_RECIPIENT, emailMode, event.getEventId(), event.getAggregateId());
            return;
        }

        String idempotencyKey = emailIdempotencyKey(event, template, normalizedRecipient);
        if (notificationEmailDeliveryRepository.existsById(idempotencyKey)) {
            recordAttempt(metricTemplate, RESULT_SKIPPED_DUPLICATE);
            log.info("notification_email_delivery template={} result={} mode={} event_id={} order_ref={} to={}",
                    metricTemplate, RESULT_SKIPPED_DUPLICATE, emailMode, event.getEventId(), event.getAggregateId(), maskEmail(normalizedRecipient));
            return;
        }

        Timer.Sample sample = Timer.start(meterRegistry);
        try {
            emailSender.send(new NotificationEmailSender.EmailMessage(normalizedRecipient, subject, body));
        } catch (RuntimeException ex) {
            sample.stop(latencyTimer(metricTemplate));
            recordAttempt(metricTemplate, RESULT_FAILURE);
            log.warn("notification_email_delivery template={} result={} mode={} event_id={} order_ref={} to={}",
                    metricTemplate, RESULT_FAILURE, emailMode, event.getEventId(), event.getAggregateId(), maskEmail(normalizedRecipient), ex);
            throw ex;
        }

        try {
            notificationEmailDeliveryRepository.save(new NotificationEmailDelivery(
                    idempotencyKey,
                    event.getEventId(),
                    template,
                    normalizedRecipient
            ));
        } catch (DataIntegrityViolationException ex) {
            if (notificationEmailDeliveryRepository.existsById(idempotencyKey)) {
                sample.stop(latencyTimer(metricTemplate));
                recordAttempt(metricTemplate, RESULT_SKIPPED_DUPLICATE);
                log.info("notification_email_delivery template={} result={} mode={} event_id={} order_ref={} to={} reason=duplicate_record_race",
                        metricTemplate, RESULT_SKIPPED_DUPLICATE, emailMode, event.getEventId(), event.getAggregateId(), maskEmail(normalizedRecipient));
                return;
            }
            sample.stop(latencyTimer(metricTemplate));
            recordAttempt(metricTemplate, RESULT_FAILURE);
            log.warn("notification_email_delivery template={} result={} mode={} event_id={} order_ref={} to={} reason=delivery_record_failed",
                    metricTemplate, RESULT_FAILURE, emailMode, event.getEventId(), event.getAggregateId(), maskEmail(normalizedRecipient), ex);
            throw ex;
        }
        sample.stop(latencyTimer(metricTemplate));
        recordAttempt(metricTemplate, RESULT_SENT);
        log.info("notification_email_delivery template={} result={} mode={} event_id={} order_ref={} to={}",
                metricTemplate, RESULT_SENT, emailMode, event.getEventId(), event.getAggregateId(), maskEmail(normalizedRecipient));
    }

    private Optional<String> normalizeEmailForDelivery(String email) {
        if (email == null) {
            return Optional.empty();
        }
        String normalized = email.trim().toLowerCase(Locale.ROOT);
        if (normalized.isBlank() || !normalized.contains("@")) {
            return Optional.empty();
        }
        return Optional.of(normalized);
    }

    private String emailIdempotencyKey(OutboxEvent event, String template, String recipient) {
        String normalized = event.getEventId() + ":" + template + ":" + recipient.trim().toLowerCase(Locale.ROOT);
        return UUID.nameUUIDFromBytes(normalized.getBytes(StandardCharsets.UTF_8)).toString();
    }

    private void recordAttempt(String template, String result) {
        meterRegistry.counter(
                "barmi_notification_email_attempts_total",
                "template", template,
                "result", result,
                "mode", emailMode
        ).increment();
    }

    private Timer latencyTimer(String template) {
        return Timer.builder("barmi_notification_email_latency_seconds")
                .tag("template", template)
                .tag("mode", emailMode)
                .register(meterRegistry);
    }

    private String metricTemplate(String template) {
        return switch (template) {
            case TEMPLATE_BUYER_ORDER_CREATED -> "order_created_buyer";
            case TEMPLATE_BUYER_PAYMENT_CONFIRMED -> "order_paid_buyer";
            case TEMPLATE_ADMIN_NEW_PAID_ORDER -> "order_paid_admin";
            case TEMPLATE_BUYER_ORDER_CANCELLED -> "order_cancelled_buyer";
            case TEMPLATE_BUYER_FULFILLMENT_STARTED, TEMPLATE_BUYER_FULFILLMENT_DELIVERED -> "fulfillment_update_buyer";
            default -> "unknown";
        };
    }

    private String normalizeMode(String mode) {
        String normalized = mode == null ? "logging" : mode.trim().toLowerCase(Locale.ROOT);
        if ("smtp".equals(normalized)) {
            return "smtp";
        }
        return "logging";
    }

    private String maskEmail(String email) {
        if (email == null || email.isBlank() || !email.contains("@")) {
            return "***";
        }
        String[] parts = email.split("@", 2);
        String local = parts[0];
        String domain = parts[1];
        if (local.isBlank()) {
            return "***@" + domain;
        }
        String localMasked = local.length() <= 2
                ? local.charAt(0) + "*"
                : local.substring(0, 2) + "***";
        return localMasked + "@" + domain;
    }

    private Map<String, Object> readPayload(OutboxEvent event) {
        try {
            return MAPPER.readValue(event.getPayloadJson(), new TypeReference<>() {});
        } catch (Exception e) {
            log.warn("store_notification_payload_invalid eventId={} type={}", event.getEventId(), event.getEventType(), e);
            return Map.of();
        }
    }

    private UUID parseUuid(Object value) {
        if (value == null) {
            return null;
        }
        return UUID.fromString(String.valueOf(value));
    }

    private String asString(Object value) {
        return value == null ? null : String.valueOf(value);
    }

    private String money(BigDecimal amount, String currency) {
        return amount == null ? "-" : amount.stripTrailingZeros().toPlainString() + " " + currency;
    }

    private String buildTrackingLink(String storeSlug, UUID orderId) {
        return publicScheme + "://" + storeSlug + "." + baseDomain + "/store/orders/" + orderId;
    }
}
