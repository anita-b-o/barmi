package com.barmi.app.events;

import com.barmi.app.ecosystem.EcosystemFulfillmentService;
import com.barmi.domain.events.OutboxEvent;
import com.barmi.infra.repo.OutboxEventRepository;
import jakarta.transaction.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * MVP dispatcher:
 * - polls unpublished outbox events
 * - "publishes" by logging and marking published_at
 *
 * Later: replace "publish" with RabbitMQ/Kafka, email service, notifications, etc.
 */
@Component
@EnableScheduling
@ConditionalOnProperty(name = "app.outbox.dispatcher.enabled", havingValue = "true", matchIfMissing = true)
public class OutboxDispatcher {

    private static final Logger log = LoggerFactory.getLogger(OutboxDispatcher.class);

    private final OutboxEventRepository repo;
    private final EcosystemFulfillmentService ecosystemFulfillmentService;

    public OutboxDispatcher(OutboxEventRepository repo, EcosystemFulfillmentService ecosystemFulfillmentService) {
        this.repo = repo;
        this.ecosystemFulfillmentService = ecosystemFulfillmentService;
    }

    @Scheduled(fixedDelayString = "PT5S")
    @Transactional
    public void dispatch() {
        List<OutboxEvent> events = repo.findUnpublished();
        for (OutboxEvent e : events) {
            try {
                if ("ECOSYSTEM_ORDER_PAID".equals(e.getEventType())) {
                    ecosystemFulfillmentService.createForPaidOrder(e.getAggregateId());
                }
                // "Publish" placeholder
                log.info("OUTBOX publish event_id={} type={} scope={} payload={}",
                        e.getEventId(), e.getEventType(), e.getScope(), e.getPayloadJson());
                e.markPublishedNow();
            } catch (Exception ex) {
                log.error("OUTBOX handler failed event_id={} type={}", e.getEventId(), e.getEventType(), ex);
            }
        }
        // JPA will flush published_at due to @Transactional
    }
}
