package com.barmi.domain.events;

import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class OutboxEventTest {

    @Test
    void schedulesRetryAndTruncatesLongError() {
        OutboxEvent event = new OutboxEvent(UUID.randomUUID(), "STORE_ORDER_PAID", "STORE", UUID.randomUUID(), "{}");
        String longError = "x".repeat(2100);
        Instant nextAttemptAt = Instant.now().plusSeconds(30);

        event.markClaimed("test-worker");
        event.markRetryScheduled(longError, nextAttemptAt);

        assertThat(event.getStatus()).isEqualTo(OutboxEvent.STATUS_PENDING);
        assertThat(event.getAttemptCount()).isEqualTo(1);
        assertThat(event.getNextAttemptAt()).isEqualTo(nextAttemptAt);
        assertThat(event.getClaimedAt()).isNull();
        assertThat(event.getClaimedBy()).isNull();
        assertThat(event.getLastError()).hasSize(2000);
    }

    @Test
    void publishedEventClearsOperationalErrorState() {
        OutboxEvent event = new OutboxEvent(UUID.randomUUID(), "STORE_ORDER_PAID", "STORE", UUID.randomUUID(), "{}");
        event.markClaimed("test-worker");
        event.markRetryScheduled("temporary", Instant.now().plusSeconds(30));
        event.markClaimed("test-worker");

        event.markPublishedNow();

        assertThat(event.getStatus()).isEqualTo(OutboxEvent.STATUS_PUBLISHED);
        assertThat(event.getPublishedAt()).isNotNull();
        assertThat(event.getClaimedAt()).isNull();
        assertThat(event.getClaimedBy()).isNull();
        assertThat(event.getLastError()).isNull();
        assertThat(event.getFailedAt()).isNull();
    }
}
