package com.barmi.infra.metrics;

import com.barmi.infra.repo.OutboxEventRepository;
import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ObservabilityMetricsConfig {
    public ObservabilityMetricsConfig(MeterRegistry registry, OutboxEventRepository outboxEventRepository) {
        Gauge.builder("barmi_outbox_pending_events", outboxEventRepository, repo -> repo.countByPublishedAtIsNull())
                .register(registry);
    }
}
