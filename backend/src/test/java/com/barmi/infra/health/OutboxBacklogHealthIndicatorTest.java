package com.barmi.infra.health;

import com.barmi.domain.events.OutboxEvent;
import com.barmi.infra.repo.OutboxEventRepository;
import org.junit.jupiter.api.Test;
import org.springframework.boot.actuate.health.Status;

import java.time.Duration;
import java.time.Instant;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class OutboxBacklogHealthIndicatorTest {

    private final OutboxEventRepository repository = mock(OutboxEventRepository.class);

    @Test
    void reportsUpWhenBacklogIsHealthy() {
        when(repository.countByStatus(OutboxEvent.STATUS_PENDING)).thenReturn(1L);
        when(repository.countByStatus(OutboxEvent.STATUS_PROCESSING)).thenReturn(0L);
        when(repository.countByStatus(OutboxEvent.STATUS_FAILED)).thenReturn(0L);
        when(repository.findOldestOccurredAtByStatus(OutboxEvent.STATUS_PENDING)).thenReturn(Optional.of(Instant.now()));
        OutboxBacklogHealthIndicator indicator = new OutboxBacklogHealthIndicator(repository, 10, Duration.ofMinutes(10), 0);

        assertThat(indicator.health().getStatus()).isEqualTo(Status.UP);
    }

    @Test
    void reportsDegradedWhenFailedEventsExist() {
        when(repository.countByStatus(OutboxEvent.STATUS_PENDING)).thenReturn(0L);
        when(repository.countByStatus(OutboxEvent.STATUS_PROCESSING)).thenReturn(0L);
        when(repository.countByStatus(OutboxEvent.STATUS_FAILED)).thenReturn(1L);
        when(repository.findOldestOccurredAtByStatus(OutboxEvent.STATUS_PENDING)).thenReturn(Optional.empty());
        OutboxBacklogHealthIndicator indicator = new OutboxBacklogHealthIndicator(repository, 10, Duration.ofMinutes(10), 0);

        assertThat(indicator.health().getStatus().getCode()).isEqualTo("DEGRADED");
    }

    @Test
    void reportsDegradedWhenOldestPendingIsTooOld() {
        when(repository.countByStatus(OutboxEvent.STATUS_PENDING)).thenReturn(1L);
        when(repository.countByStatus(OutboxEvent.STATUS_PROCESSING)).thenReturn(0L);
        when(repository.countByStatus(OutboxEvent.STATUS_FAILED)).thenReturn(0L);
        when(repository.findOldestOccurredAtByStatus(OutboxEvent.STATUS_PENDING)).thenReturn(Optional.of(Instant.now().minus(Duration.ofMinutes(20))));
        OutboxBacklogHealthIndicator indicator = new OutboxBacklogHealthIndicator(repository, 10, Duration.ofMinutes(10), 0);

        assertThat(indicator.health().getStatus().getCode()).isEqualTo("DEGRADED");
    }
}
