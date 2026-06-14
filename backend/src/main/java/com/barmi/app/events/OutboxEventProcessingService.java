package com.barmi.app.events;

import com.barmi.domain.events.OutboxEvent;
import com.barmi.infra.repo.OutboxEventRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Service
public class OutboxEventProcessingService {
    private final OutboxEventRepository outboxEventRepository;

    public OutboxEventProcessingService(OutboxEventRepository outboxEventRepository) {
        this.outboxEventRepository = outboxEventRepository;
    }

    @Transactional
    public List<OutboxEvent> claimBatch(String instanceId, int batchSize, Instant staleBefore) {
        List<UUID> eventIds = outboxEventRepository.findClaimableEventIds(staleBefore, batchSize);
        if (eventIds.isEmpty()) {
            return List.of();
        }
        List<OutboxEvent> events = outboxEventRepository.findAllById(eventIds);
        events.forEach(event -> event.markClaimed(instanceId));
        outboxEventRepository.saveAll(events);
        return events.stream()
                .sorted(Comparator.comparing(OutboxEvent::getOccurredAt))
                .toList();
    }

    @Transactional
    public boolean markPublished(UUID eventId, String instanceId) {
        return outboxEventRepository.findByIdForUpdate(eventId)
                .map(event -> {
            if (isOwnedProcessingClaim(event, instanceId)) {
                event.markPublishedNow();
                return true;
            }
            return false;
        }).orElse(false);
    }

    @Transactional
    public boolean markFailedOrRetry(UUID eventId, String instanceId, int maxAttempts, Instant nextAttemptAt, String error) {
        return outboxEventRepository.findByIdForUpdate(eventId)
                .map(event -> {
                    if (!isOwnedProcessingClaim(event, instanceId)) {
                        return false;
                    }
                    int nextAttemptCount = event.getAttemptCount() + 1;
                    if (nextAttemptCount >= maxAttempts) {
                        event.markFailed(error);
                        return true;
                    }
                    event.markRetryScheduled(error, nextAttemptAt);
                    return false;
                })
                .orElse(false);
    }

    private boolean isOwnedProcessingClaim(OutboxEvent event, String instanceId) {
        return OutboxEvent.STATUS_PROCESSING.equals(event.getStatus())
                && instanceId.equals(event.getClaimedBy());
    }
}
