package com.barmi.infra.repo;

import com.barmi.domain.beta.BetaProductEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

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
}
