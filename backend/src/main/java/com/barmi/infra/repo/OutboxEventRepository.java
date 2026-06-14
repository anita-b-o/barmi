package com.barmi.infra.repo;

import com.barmi.domain.events.OutboxEvent;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.time.Instant;
import java.util.UUID;

public interface OutboxEventRepository extends JpaRepository<OutboxEvent, UUID> {

    long countByStatus(String status);

    @Query("""
            select min(e.occurredAt)
            from OutboxEvent e
            where e.publishedAt is null
              and e.status = :status
            """)
    Optional<Instant> findOldestOccurredAtByStatus(@Param("status") String status);

    @Query(value = """
            select event_id
            from outbox_events
            where published_at is null
              and (
                    (status = 'PENDING' and next_attempt_at <= current_timestamp)
                    or (status = 'PROCESSING' and claimed_at < :staleBefore)
                  )
            order by occurred_at asc
            limit :batchSize
            for update skip locked
            """, nativeQuery = true)
    List<UUID> findClaimableEventIds(@Param("staleBefore") Instant staleBefore, @Param("batchSize") int batchSize);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select e from OutboxEvent e where e.eventId = :eventId")
    Optional<OutboxEvent> findByIdForUpdate(@Param("eventId") UUID eventId);

    List<OutboxEvent> findByAggregateIdAndEventType(UUID aggregateId, String eventType);
    List<OutboxEvent> findByAggregateIdOrderByOccurredAtAsc(UUID aggregateId);
    boolean existsByAggregateIdAndEventType(UUID aggregateId, String eventType);
    Optional<OutboxEvent> findFirstByAggregateIdAndEventTypeOrderByOccurredAtDesc(UUID aggregateId, String eventType);

    @Query("select e.aggregateId from OutboxEvent e where e.eventType = :eventType and e.aggregateId in :aggregateIds")
    Set<UUID> findAggregateIdsByEventTypeAndAggregateIdIn(@Param("eventType") String eventType, @Param("aggregateIds") Set<UUID> aggregateIds);

    @Query("""
            select count(distinct e.aggregateId)
            from OutboxEvent e
            join StoreOrder o on o.id = e.aggregateId
            where e.scope = :scope
              and e.eventType = :eventType
              and o.storeId = :storeId
              and e.occurredAt >= :fromInclusive
              and e.occurredAt < :toExclusive
            """)
    long countDistinctStoreOrderEventsInRange(
            @Param("scope") String scope,
            @Param("eventType") String eventType,
            @Param("storeId") UUID storeId,
            @Param("fromInclusive") Instant fromInclusive,
            @Param("toExclusive") Instant toExclusive
    );
}
