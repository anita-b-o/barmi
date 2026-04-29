package com.barmi.app.notifications;

import com.barmi.domain.events.OutboxEvent;
import com.barmi.domain.orders.StoreOrder;
import com.barmi.domain.store.Store;
import com.barmi.infra.repo.OutboxEventRepository;
import com.barmi.infra.repo.StoreOrderRepository;
import com.barmi.infra.repo.StoreRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
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
    private final NotificationEmailSender emailSender;
    private final OutboxEventRepository outboxEventRepository;
    private final StoreOrderRepository storeOrderRepository;
    private final StoreRepository storeRepository;
    private final String publicScheme;
    private final String baseDomain;

    public StoreOrderNotificationService(
            NotificationEmailSender emailSender,
            OutboxEventRepository outboxEventRepository,
            StoreOrderRepository storeOrderRepository,
            StoreRepository storeRepository,
            @Value("${app.notifications.storePublicScheme:https}") String publicScheme,
            @Value("${app.tenant.baseDomain}") String baseDomain
    ) {
        this.emailSender = emailSender;
        this.outboxEventRepository = outboxEventRepository;
        this.storeOrderRepository = storeOrderRepository;
        this.storeRepository = storeRepository;
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
        emailSender.send(new NotificationEmailSender.EmailMessage(recipient, subject, body));
    }

    private void notifyPaymentConfirmed(OutboxEvent event) {
        UUID orderId = event.getAggregateId();
        String recipient = findNotificationEmail(orderId).orElse(null);
        if (recipient == null || orderId == null) {
            return;
        }

        StoreOrder order = findOrder(orderId);
        Store store = findStore(order.getStoreId());
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
        emailSender.send(new NotificationEmailSender.EmailMessage(recipient, subject, body));
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
        emailSender.send(new NotificationEmailSender.EmailMessage(recipient, subject, body));
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
        emailSender.send(new NotificationEmailSender.EmailMessage(recipient, subject, body));
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
        emailSender.send(new NotificationEmailSender.EmailMessage(recipient, subject, body));
    }

    private Optional<String> findNotificationEmail(UUID orderId) {
        if (orderId == null) {
            return Optional.empty();
        }
        Optional<String> persistedBuyerEmail = storeOrderRepository.findById(orderId)
                .map(StoreOrder::getBuyerEmail)
                .filter(email -> email != null && !email.isBlank());
        if (persistedBuyerEmail.isPresent()) {
            return persistedBuyerEmail;
        }
        return outboxEventRepository.findFirstByAggregateIdAndEventTypeOrderByOccurredAtDesc(orderId, STORE_ORDER_CREATED)
                .map(this::readPayload)
                .map(payload -> asString(payload.get("notificationEmail")))
                .filter(email -> email != null && !email.isBlank());
    }

    private StoreOrder findOrder(UUID orderId) {
        return storeOrderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalStateException("store_order_not_found_for_notification"));
    }

    private Store findStore(UUID storeId) {
        return storeRepository.findById(storeId)
                .orElseThrow(() -> new IllegalStateException("store_not_found_for_notification"));
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
