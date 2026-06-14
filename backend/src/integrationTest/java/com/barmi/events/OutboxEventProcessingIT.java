package com.barmi.events;

import com.barmi.PostgresIntegrationTestBase;
import com.barmi.app.events.OutboxEventProcessingService;
import com.barmi.domain.enums.PaymentScope;
import com.barmi.domain.events.OutboxEvent;
import com.barmi.infra.repo.OutboxEventRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;

class OutboxEventProcessingIT extends PostgresIntegrationTestBase {

    @Autowired
    JdbcTemplate jdbcTemplate;

    @Autowired
    OutboxEventRepository outboxEventRepository;

    @Autowired
    OutboxEventProcessingService outboxEventProcessingService;

    @BeforeEach
    void setUp() {
        truncateAllTables(jdbcTemplate);
    }

    @Test
    void claimBatchHonorsBatchSizeAndMarksEventsProcessing() {
        List<OutboxEvent> events = createEvents(3);
        outboxEventRepository.saveAll(events);

        List<OutboxEvent> claimed = outboxEventProcessingService.claimBatch(
                "worker-a",
                2,
                Instant.now().minusSeconds(120)
        );

        assertThat(claimed).hasSize(2);
        assertThat(claimed).allSatisfy(event -> {
            assertThat(event.getStatus()).isEqualTo(OutboxEvent.STATUS_PROCESSING);
            assertThat(event.getClaimedBy()).isEqualTo("worker-a");
            assertThat(event.getClaimedAt()).isNotNull();
            assertThat(event.getLastAttemptAt()).isNotNull();
        });
    }

    @Test
    void twoClaimersReceiveDisjointEvents() {
        outboxEventRepository.saveAll(createEvents(4));

        List<OutboxEvent> firstClaim = outboxEventProcessingService.claimBatch(
                "worker-a",
                2,
                Instant.now().minusSeconds(120)
        );
        List<OutboxEvent> secondClaim = outboxEventProcessingService.claimBatch(
                "worker-b",
                2,
                Instant.now().minusSeconds(120)
        );

        Set<UUID> firstIds = firstClaim.stream().map(OutboxEvent::getEventId).collect(Collectors.toSet());
        Set<UUID> secondIds = secondClaim.stream().map(OutboxEvent::getEventId).collect(Collectors.toSet());
        assertThat(firstClaim).hasSize(2);
        assertThat(secondClaim).hasSize(2);
        assertThat(firstIds).doesNotContainAnyElementsOf(secondIds);
    }

    @Test
    void staleProcessingEventCanBeReclaimed() {
        OutboxEvent event = outboxEventRepository.save(event());
        event.markClaimed("worker-a");
        outboxEventRepository.save(event);
        jdbcTemplate.update(
                "update outbox_events set claimed_at = now() - interval '5 minutes' where event_id = ?",
                event.getEventId()
        );

        List<OutboxEvent> claimed = outboxEventProcessingService.claimBatch(
                "worker-b",
                10,
                Instant.now().minusSeconds(120)
        );

        assertThat(claimed).extracting(OutboxEvent::getEventId).contains(event.getEventId());
        assertThat(claimed.get(0).getClaimedBy()).isEqualTo("worker-b");
    }

    @Test
    void nonStaleProcessingEventIsNotReclaimed() {
        OutboxEvent event = outboxEventRepository.save(event());
        event.markClaimed("worker-a");
        outboxEventRepository.save(event);

        List<OutboxEvent> claimed = outboxEventProcessingService.claimBatch(
                "worker-b",
                10,
                Instant.now().minusSeconds(120)
        );

        assertThat(claimed).isEmpty();
    }

    @Test
    void failedEventIsNotClaimed() {
        OutboxEvent event = event();
        event.markClaimed("worker-a");
        event.markFailed("poison");
        outboxEventRepository.save(event);

        List<OutboxEvent> claimed = outboxEventProcessingService.claimBatch(
                "worker-b",
                10,
                Instant.now().minusSeconds(120)
        );

        assertThat(claimed).isEmpty();
    }

    @Test
    void successfulProcessingMarksEventPublished() {
        OutboxEvent event = outboxEventRepository.save(event());
        OutboxEvent claimed = outboxEventProcessingService.claimBatch(
                "worker-a",
                1,
                Instant.now().minusSeconds(120)
        ).get(0);

        boolean marked = outboxEventProcessingService.markPublished(claimed.getEventId(), "worker-a");

        OutboxEvent reloaded = outboxEventRepository.findById(event.getEventId()).orElseThrow();
        assertThat(marked).isTrue();
        assertThat(reloaded.getStatus()).isEqualTo(OutboxEvent.STATUS_PUBLISHED);
        assertThat(reloaded.getPublishedAt()).isNotNull();
        assertThat(reloaded.getClaimedBy()).isNull();
    }

    @Test
    void publishWithLostClaimDoesNotMarkEventPublished() {
        OutboxEvent event = outboxEventRepository.save(event());
        OutboxEvent claimed = outboxEventProcessingService.claimBatch(
                "worker-a",
                1,
                Instant.now().minusSeconds(120)
        ).get(0);
        jdbcTemplate.update(
                "update outbox_events set claimed_by = 'worker-b' where event_id = ?",
                claimed.getEventId()
        );

        boolean marked = outboxEventProcessingService.markPublished(claimed.getEventId(), "worker-a");

        OutboxEvent reloaded = outboxEventRepository.findById(event.getEventId()).orElseThrow();
        assertThat(marked).isFalse();
        assertThat(reloaded.getStatus()).isEqualTo(OutboxEvent.STATUS_PROCESSING);
        assertThat(reloaded.getPublishedAt()).isNull();
        assertThat(reloaded.getClaimedBy()).isEqualTo("worker-b");
    }

    @Test
    void failureSchedulesRetryThenDeadLettersAtMaxAttempts() {
        OutboxEvent event = outboxEventRepository.save(event());
        OutboxEvent firstClaim = outboxEventProcessingService.claimBatch(
                "worker-a",
                1,
                Instant.now().minusSeconds(120)
        ).get(0);

        boolean firstDeadLetter = outboxEventProcessingService.markFailedOrRetry(
                firstClaim.getEventId(),
                "worker-a",
                2,
                Instant.now().plusSeconds(30),
                "temporary"
        );
        OutboxEvent retry = outboxEventRepository.findById(event.getEventId()).orElseThrow();
        retry.markClaimed("worker-a");
        outboxEventRepository.save(retry);

        boolean secondDeadLetter = outboxEventProcessingService.markFailedOrRetry(
                retry.getEventId(),
                "worker-a",
                2,
                Instant.now().plusSeconds(30),
                "poison"
        );

        OutboxEvent reloaded = outboxEventRepository.findById(event.getEventId()).orElseThrow();
        assertThat(firstDeadLetter).isFalse();
        assertThat(secondDeadLetter).isTrue();
        assertThat(reloaded.getStatus()).isEqualTo(OutboxEvent.STATUS_FAILED);
        assertThat(reloaded.getAttemptCount()).isEqualTo(2);
        assertThat(reloaded.getFailedAt()).isNotNull();
    }

    private List<OutboxEvent> createEvents(int count) {
        return IntStream.range(0, count)
                .mapToObj(ignored -> event())
                .toList();
    }

    private OutboxEvent event() {
        return new OutboxEvent(
                UUID.randomUUID(),
                "STORE_ORDER_CREATED",
                PaymentScope.STORE.name(),
                UUID.randomUUID(),
                "{}"
        );
    }
}
