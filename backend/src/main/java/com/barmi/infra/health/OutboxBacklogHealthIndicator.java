package com.barmi.infra.health;

import com.barmi.infra.repo.OutboxEventRepository;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class OutboxBacklogHealthIndicator implements HealthIndicator {
    private final OutboxEventRepository outboxEventRepository;
    private final long backlogThreshold;

    public OutboxBacklogHealthIndicator(
            OutboxEventRepository outboxEventRepository,
            @Value("${observability.outbox.backlog-threshold:1000}") long backlogThreshold
    ) {
        this.outboxEventRepository = outboxEventRepository;
        this.backlogThreshold = backlogThreshold;
    }

    @Override
    public Health health() {
        long pending = outboxEventRepository.countByPublishedAtIsNull();
        Health.Builder builder = pending > backlogThreshold
                ? Health.status("DEGRADED")
                : Health.up();
        return builder
                .withDetail("outbox_pending_events", pending)
                .withDetail("outbox_backlog_threshold", backlogThreshold)
                .build();
    }
}
