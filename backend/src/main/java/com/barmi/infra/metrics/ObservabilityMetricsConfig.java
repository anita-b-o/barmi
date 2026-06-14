package com.barmi.infra.metrics;

import com.barmi.domain.events.OutboxEvent;
import com.barmi.infra.repo.OutboxEventRepository;
import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;
import java.time.Instant;

@Configuration
public class ObservabilityMetricsConfig {
    public ObservabilityMetricsConfig(MeterRegistry registry, OutboxEventRepository outboxEventRepository) {
        Gauge.builder("barmi_outbox_pending_events", outboxEventRepository, repo -> repo.countByStatus(OutboxEvent.STATUS_PENDING))
                .register(registry);
        Gauge.builder("barmi_outbox_failed_events", outboxEventRepository, repo -> repo.countByStatus(OutboxEvent.STATUS_FAILED))
                .register(registry);
        Gauge.builder("barmi_outbox_processing_events", outboxEventRepository, repo -> repo.countByStatus(OutboxEvent.STATUS_PROCESSING))
                .register(registry);
        Gauge.builder("barmi_outbox_oldest_pending_age_seconds", outboxEventRepository, ObservabilityMetricsConfig::oldestPendingAgeSeconds)
                .register(registry);
    }

    private static double oldestPendingAgeSeconds(OutboxEventRepository repo) {
        return repo.findOldestOccurredAtByStatus(OutboxEvent.STATUS_PENDING)
                .map(occurredAt -> (double) Math.max(0L, Duration.between(occurredAt, Instant.now()).toSeconds()))
                .orElse(0.0);
    }
}
