package com.barmi.app.events;

import com.barmi.app.ecosystem.EcosystemFulfillmentService;
import com.barmi.app.notifications.StoreOrderNotificationService;
import com.barmi.domain.enums.PaymentScope;
import com.barmi.domain.events.OutboxEvent;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class OutboxDispatcherTest {

    private final OutboxEventProcessingService outboxEventProcessingService = mock(OutboxEventProcessingService.class);
    private final EcosystemFulfillmentService ecosystemFulfillmentService = mock(EcosystemFulfillmentService.class);
    private final StoreOrderNotificationService storeOrderNotificationService = mock(StoreOrderNotificationService.class);
    private final SimpleMeterRegistry meterRegistry = new SimpleMeterRegistry();
    private final OutboxDispatcher dispatcher = new OutboxDispatcher(
            outboxEventProcessingService,
            ecosystemFulfillmentService,
            storeOrderNotificationService,
            meterRegistry,
            50,
            10,
            Duration.ofMinutes(2)
    );

    @Test
    void publishesUnknownEventWithoutHandlerFailure() {
        OutboxEvent event = event("ECOSYSTEM_UNKNOWN", PaymentScope.ECOSYSTEM.name());
        when(outboxEventProcessingService.claimBatch(anyString(), eq(50), any(Instant.class))).thenReturn(List.of(event));
        when(outboxEventProcessingService.markPublished(eq(event.getEventId()), anyString())).thenReturn(true);

        dispatcher.dispatch();

        verify(outboxEventProcessingService).markPublished(eq(event.getEventId()), anyString());
        verify(ecosystemFulfillmentService, never()).createForPaidOrder(any());
        verify(storeOrderNotificationService, never()).handle(any());
        assertThat(meterRegistry.counter("barmi_outbox_dispatch_success_total", "scope", "ECOSYSTEM", "event_type", "ECOSYSTEM_UNKNOWN").count())
                .isEqualTo(1.0);
    }

    @Test
    void dispatchesEcosystemPaidEventToFulfillment() {
        OutboxEvent event = event("ECOSYSTEM_ORDER_PAID", PaymentScope.ECOSYSTEM.name());
        when(outboxEventProcessingService.claimBatch(anyString(), eq(50), any(Instant.class))).thenReturn(List.of(event));
        when(outboxEventProcessingService.markPublished(eq(event.getEventId()), anyString())).thenReturn(true);

        dispatcher.dispatch();

        verify(ecosystemFulfillmentService).createForPaidOrder(event.getAggregateId());
        verify(outboxEventProcessingService).markPublished(eq(event.getEventId()), anyString());
    }

    @Test
    void dispatchesStoreEventToNotificationService() {
        OutboxEvent event = event("STORE_ORDER_PAID", PaymentScope.STORE.name());
        when(outboxEventProcessingService.claimBatch(anyString(), eq(50), any(Instant.class))).thenReturn(List.of(event));
        when(outboxEventProcessingService.markPublished(eq(event.getEventId()), anyString())).thenReturn(true);

        dispatcher.dispatch();

        verify(storeOrderNotificationService).handle(event);
        verify(outboxEventProcessingService).markPublished(eq(event.getEventId()), anyString());
    }

    @Test
    void failedEventIsScheduledForRetry() {
        OutboxEvent event = event("STORE_ORDER_PAID", PaymentScope.STORE.name());
        when(outboxEventProcessingService.claimBatch(anyString(), eq(50), any(Instant.class))).thenReturn(List.of(event));
        org.mockito.Mockito.doThrow(new IllegalStateException("smtp_down")).when(storeOrderNotificationService).handle(event);

        dispatcher.dispatch();

        verify(outboxEventProcessingService).markFailedOrRetry(
                eq(event.getEventId()),
                anyString(),
                eq(10),
                any(Instant.class),
                eq("IllegalStateException: smtp_down")
        );
        assertThat(meterRegistry.counter("barmi_outbox_dispatch_failure_total", "scope", "STORE", "event_type", "STORE_ORDER_PAID").count())
                .isEqualTo(1.0);
    }

    @Test
    void claimLostAfterHandlerDoesNotRecordSuccessMetric() {
        OutboxEvent event = event("STORE_ORDER_PAID", PaymentScope.STORE.name());
        when(outboxEventProcessingService.claimBatch(anyString(), eq(50), any(Instant.class))).thenReturn(List.of(event));
        when(outboxEventProcessingService.markPublished(eq(event.getEventId()), anyString())).thenReturn(false);

        dispatcher.dispatch();

        verify(storeOrderNotificationService).handle(event);
        assertThat(meterRegistry.counter("barmi_outbox_dispatch_success_total", "scope", "STORE", "event_type", "STORE_ORDER_PAID").count())
                .isEqualTo(0.0);
    }

    @Test
    void deadLetteredEventIncrementsDeadLetterMetric() {
        OutboxEvent event = event("STORE_ORDER_PAID", PaymentScope.STORE.name());
        when(outboxEventProcessingService.claimBatch(anyString(), eq(50), any(Instant.class))).thenReturn(List.of(event));
        org.mockito.Mockito.doThrow(new IllegalStateException("smtp_down")).when(storeOrderNotificationService).handle(event);
        when(outboxEventProcessingService.markFailedOrRetry(eq(event.getEventId()), anyString(), anyInt(), any(Instant.class), anyString()))
                .thenReturn(true);

        dispatcher.dispatch();

        assertThat(meterRegistry.counter("barmi_outbox_dispatch_dead_letter_total", "scope", "STORE", "event_type", "STORE_ORDER_PAID").count())
                .isEqualTo(1.0);
    }

    @Test
    void backoffMatchesOperationalPlan() {
        assertThat(OutboxDispatcher.backoffForNextAttempt(1)).isEqualTo(Duration.ofSeconds(30));
        assertThat(OutboxDispatcher.backoffForNextAttempt(2)).isEqualTo(Duration.ofMinutes(1));
        assertThat(OutboxDispatcher.backoffForNextAttempt(3)).isEqualTo(Duration.ofMinutes(5));
        assertThat(OutboxDispatcher.backoffForNextAttempt(4)).isEqualTo(Duration.ofMinutes(15));
        assertThat(OutboxDispatcher.backoffForNextAttempt(10)).isEqualTo(Duration.ofMinutes(15));
    }

    private OutboxEvent event(String eventType, String scope) {
        return new OutboxEvent(
                UUID.randomUUID(),
                eventType,
                scope,
                UUID.randomUUID(),
                "{}"
        );
    }
}
