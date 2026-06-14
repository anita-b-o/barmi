package com.barmi.app.events;

import com.barmi.app.ecosystem.EcosystemFulfillmentService;
import com.barmi.app.notifications.StoreOrderNotificationService;
import com.barmi.domain.events.OutboxEvent;
import io.micrometer.core.instrument.MeterRegistry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.net.InetAddress;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Database-backed outbox dispatcher with at-least-once delivery semantics.
 */
@Component
@EnableScheduling
@ConditionalOnProperty(name = "app.outbox.dispatcher.enabled", havingValue = "true", matchIfMissing = true)
public class OutboxDispatcher {

    private static final Logger log = LoggerFactory.getLogger(OutboxDispatcher.class);

    private final OutboxEventProcessingService outboxEventProcessingService;
    private final EcosystemFulfillmentService ecosystemFulfillmentService;
    private final StoreOrderNotificationService storeOrderNotificationService;
    private final MeterRegistry meterRegistry;
    private final String instanceId;
    private final int batchSize;
    private final int maxAttempts;
    private final Duration lockTimeout;

    public OutboxDispatcher(
            OutboxEventProcessingService outboxEventProcessingService,
            EcosystemFulfillmentService ecosystemFulfillmentService,
            StoreOrderNotificationService storeOrderNotificationService,
            MeterRegistry meterRegistry,
            @Value("${app.outbox.dispatcher.batch-size:50}") int batchSize,
            @Value("${app.outbox.dispatcher.max-attempts:10}") int maxAttempts,
            @Value("${app.outbox.dispatcher.lock-timeout:PT2M}") Duration lockTimeout
    ) {
        this.outboxEventProcessingService = outboxEventProcessingService;
        this.ecosystemFulfillmentService = ecosystemFulfillmentService;
        this.storeOrderNotificationService = storeOrderNotificationService;
        this.meterRegistry = meterRegistry;
        this.instanceId = buildInstanceId();
        this.batchSize = Math.max(1, batchSize);
        this.maxAttempts = Math.max(1, maxAttempts);
        this.lockTimeout = lockTimeout == null ? Duration.ofMinutes(2) : lockTimeout;
    }

    @Scheduled(fixedDelayString = "PT5S")
    public void dispatch() {
        Instant staleBefore = Instant.now().minus(lockTimeout);
        List<OutboxEvent> events = outboxEventProcessingService.claimBatch(instanceId, batchSize, staleBefore);
        for (OutboxEvent e : events) {
            dispatchOne(e);
        }
    }

    private void dispatchOne(OutboxEvent e) {
        try {
            handle(e);
            boolean published = outboxEventProcessingService.markPublished(e.getEventId(), instanceId);
            if (!published) {
                log.warn("outbox_event_publish_skipped event_id={} type={} scope={} aggregate_id={} reason=claim_lost",
                        e.getEventId(), e.getEventType(), e.getScope(), e.getAggregateId());
                return;
            }
            meterRegistry.counter(
                    "barmi_outbox_dispatch_success_total",
                    "scope", e.getScope(),
                    "event_type", e.getEventType()
            ).increment();
            log.info("outbox_event_published event_id={} type={} scope={} aggregate_id={} attempt_count={}",
                    e.getEventId(), e.getEventType(), e.getScope(), e.getAggregateId(), e.getAttemptCount());
        } catch (Exception ex) {
            Instant nextAttemptAt = Instant.now().plus(backoffForNextAttempt(e.getAttemptCount() + 1));
            boolean deadLettered = outboxEventProcessingService.markFailedOrRetry(
                    e.getEventId(),
                    instanceId,
                    maxAttempts,
                    nextAttemptAt,
                    errorSummary(ex)
            );
            meterRegistry.counter(
                    "barmi_outbox_dispatch_failure_total",
                    "scope", e.getScope(),
                    "event_type", e.getEventType()
            ).increment();
            if (deadLettered) {
                meterRegistry.counter(
                        "barmi_outbox_dispatch_dead_letter_total",
                        "scope", e.getScope(),
                        "event_type", e.getEventType()
                ).increment();
            }
            log.error("outbox_event_failed event_id={} type={} scope={} aggregate_id={} next_attempt_at={} dead_lettered={}",
                    e.getEventId(), e.getEventType(), e.getScope(), e.getAggregateId(), nextAttemptAt, deadLettered, ex);
        }
    }

    private void handle(OutboxEvent e) {
        if ("ECOSYSTEM_ORDER_PAID".equals(e.getEventType())) {
            ecosystemFulfillmentService.createForPaidOrder(e.getAggregateId());
        }
        if ("STORE".equals(e.getScope())) {
            storeOrderNotificationService.handle(e);
        }
    }

    static Duration backoffForNextAttempt(int nextAttemptCount) {
        if (nextAttemptCount <= 1) {
            return Duration.ofSeconds(30);
        }
        if (nextAttemptCount == 2) {
            return Duration.ofMinutes(1);
        }
        if (nextAttemptCount == 3) {
            return Duration.ofMinutes(5);
        }
        return Duration.ofMinutes(15);
    }

    private String errorSummary(Exception ex) {
        String type = ex.getClass().getSimpleName();
        String message = ex.getMessage();
        if (message == null || message.isBlank()) {
            return type;
        }
        return type + ": " + message;
    }

    private String buildInstanceId() {
        String host = "unknown-host";
        try {
            host = InetAddress.getLocalHost().getHostName();
        } catch (Exception ignored) {
            // Hostname is only diagnostic; keep startup resilient.
        }
        return host + "-" + UUID.randomUUID().toString().substring(0, 8);
    }
}
