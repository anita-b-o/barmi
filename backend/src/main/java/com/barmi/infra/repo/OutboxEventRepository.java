package com.barmi.infra.repo;

import com.barmi.domain.events.OutboxEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

public interface OutboxEventRepository extends JpaRepository<OutboxEvent, UUID> {

    @Query("select e from OutboxEvent e where e.publishedAt is null order by e.occurredAt asc")
    List<OutboxEvent> findUnpublished();

    long countByPublishedAtIsNull();

    List<OutboxEvent> findByAggregateIdAndEventType(UUID aggregateId, String eventType);
}
