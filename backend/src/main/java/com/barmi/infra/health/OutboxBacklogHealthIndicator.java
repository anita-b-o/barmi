package com.barmi.infra.health;

import com.barmi.domain.events.OutboxEvent;
import com.barmi.infra.repo.OutboxEventRepository;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.Optional;

@Component
public class OutboxBacklogHealthIndicator implements HealthIndicator {
    private final OutboxEventRepository outboxEventRepository;
    private final long backlogThreshold;
    private final Duration oldestPendingThreshold;
    private final long failedThreshold;

    public OutboxBacklogHealthIndicator(
            OutboxEventRepository outboxEventRepository,
            @Value("${observability.outbox.backlog-threshold:1000}") long backlogThreshold,
            @Value("${observability.outbox.oldest-pending-threshold:PT10M}") Duration oldestPendingThreshold,
            @Value("${observability.outbox.failed-threshold:0}") long failedThreshold
    ) {
        this.outboxEventRepository = outboxEventRepository;
        this.backlogThreshold = backlogThreshold;
        this.oldestPendingThreshold = oldestPendingThreshold;
        this.failedThreshold = failedThreshold;
    }

    @Override
    public Health health() {
        long pending = outboxEventRepository.countByStatus(OutboxEvent.STATUS_PENDING);
        long processing = outboxEventRepository.countByStatus(OutboxEvent.STATUS_PROCESSING);
        long failed = outboxEventRepository.countByStatus(OutboxEvent.STATUS_FAILED);
        Optional<Instant> oldestPending = outboxEventRepository.findOldestOccurredAtByStatus(OutboxEvent.STATUS_PENDING);
        long oldestPendingAgeSeconds = oldestPending
                .map(occurredAt -> Math.max(0L, Duration.between(occurredAt, Instant.now()).toSeconds()))
                .orElse(0L);
        boolean degraded = pending > backlogThreshold
                || failed > failedThreshold
                || oldestPendingAgeSeconds > oldestPendingThreshold.toSeconds();
        Health.Builder builder = degraded
                ? Health.status("DEGRADED")
                : Health.up();
        return builder
                .withDetail("outbox_pending_events", pending)
                .withDetail("outbox_processing_events", processing)
                .withDetail("outbox_failed_events", failed)
                .withDetail("outbox_backlog_threshold", backlogThreshold)
                .withDetail("outbox_oldest_pending_age_seconds", oldestPendingAgeSeconds)
                .withDetail("outbox_oldest_pending_threshold_seconds", oldestPendingThreshold.toSeconds())
                .withDetail("outbox_failed_threshold", failedThreshold)
                .build();
    }
}
