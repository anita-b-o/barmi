package com.barmi.infra.repo;

import com.barmi.domain.beta.BetaProductEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface BetaProductEventRepository extends JpaRepository<BetaProductEvent, UUID> {

    interface EventCountView {
        String getEventName();
        long getTotal();
    }

    interface TopStoreView {
        String getStoreSlug();
        String getStoreName();
        long getViews();
    }

    interface TopSearchView {
        String getSearchTerm();
        long getUses();
    }

    interface RecentFailureView {
        String getEventName();
        String getRoute();
        String getRequestId();
        String getReleaseId();
        Instant getOccurredAt();
        String getMetadataJson();
    }

    interface StoreProductTelemetryCountView {
        String getProductSlug();
        String getEventName();
        long getTotal();
    }

    @Query("""
            select e.eventName as eventName, count(e) as total
            from BetaProductEvent e
            group by e.eventName
            """)
    List<EventCountView> countAllByEventName();

    @Query("""
            select e.storeSlug as storeSlug, e.storeName as storeName, count(e) as views
            from BetaProductEvent e
            where e.eventName = 'store_view'
              and e.storeSlug is not null
            group by e.storeSlug, e.storeName
            order by count(e) desc, e.storeName asc
            """)
    List<TopStoreView> findTopStoreViews(org.springframework.data.domain.Pageable pageable);

    @Query("""
            select e.searchTerm as searchTerm, count(e) as uses
            from BetaProductEvent e
            where e.eventName = 'search_used'
              and e.searchTerm is not null
            group by e.searchTerm
            order by count(e) desc, e.searchTerm asc
            """)
    List<TopSearchView> findTopSearchTerms(org.springframework.data.domain.Pageable pageable);

    @Query("""
            select e.eventName as eventName,
                   e.route as route,
                   e.requestId as requestId,
                   e.releaseId as releaseId,
                   e.occurredAt as occurredAt,
                   e.metadataJson as metadataJson
            from BetaProductEvent e
            where e.eventName in ('checkout_failure', 'login_failure')
            order by e.occurredAt desc
            """)
    List<RecentFailureView> findRecentFailures(org.springframework.data.domain.Pageable pageable);

    @Query("""
            select e.productId as productSlug,
                   e.eventName as eventName,
                   count(e) as total
            from BetaProductEvent e
            where e.storeSlug = :storeSlug
              and e.productId is not null
              and e.occurredAt >= :fromInclusive
              and e.occurredAt < :toExclusive
              and e.eventName in (
                'public_product_card_clicked',
                'public_product_detail_viewed',
                'public_product_detail_add_to_cart'
              )
            group by e.productId, e.eventName
            """)
    List<StoreProductTelemetryCountView> countStorePublicProductEventsBySlugInRange(
            @org.springframework.data.repository.query.Param("storeSlug") String storeSlug,
            @org.springframework.data.repository.query.Param("fromInclusive") Instant fromInclusive,
            @org.springframework.data.repository.query.Param("toExclusive") Instant toExclusive
    );

    @Query("""
            select e.eventName as eventName, count(e) as total
            from BetaProductEvent e
            where e.storeSlug = :storeSlug
              and e.occurredAt >= :fromInclusive
              and e.occurredAt < :toExclusive
              and e.eventName in (
                'public_product_list_viewed',
                'public_product_card_clicked',
                'public_product_detail_viewed',
                'public_product_detail_add_to_cart'
              )
            group by e.eventName
            """)
    List<EventCountView> countStorePublicFunnelEventsByNameInRange(
            @org.springframework.data.repository.query.Param("storeSlug") String storeSlug,
            @org.springframework.data.repository.query.Param("fromInclusive") Instant fromInclusive,
            @org.springframework.data.repository.query.Param("toExclusive") Instant toExclusive
    );
}
