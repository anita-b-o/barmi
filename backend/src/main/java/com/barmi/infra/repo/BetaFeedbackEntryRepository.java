package com.barmi.infra.repo;

import com.barmi.domain.beta.BetaFeedbackEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface BetaFeedbackEntryRepository extends JpaRepository<BetaFeedbackEntry, UUID> {

    interface CategoryCountView {
        String getCategory();
        long getTotal();
    }

    interface FeedbackRouteCountView {
        String getRoute();
        long getTotal();
    }

    interface RecentFeedbackView {
        String getCategory();
        Integer getScore();
        String getMessage();
        String getRoute();
        String getRequestId();
        String getReleaseId();
        Instant getCreatedAt();
    }

    @Query("""
            select e.category as category, count(e) as total
            from BetaFeedbackEntry e
            group by e.category
            """)
    List<CategoryCountView> countAllByCategory();

    @Query("""
            select e.route as route, count(e) as total
            from BetaFeedbackEntry e
            group by e.route
            order by count(e) desc, e.route asc
            """)
    List<FeedbackRouteCountView> findTopFeedbackRoutes(org.springframework.data.domain.Pageable pageable);

    @Query("""
            select e.category as category,
                   e.score as score,
                   e.message as message,
                   e.route as route,
                   e.requestId as requestId,
                   e.releaseId as releaseId,
                   e.createdAt as createdAt
            from BetaFeedbackEntry e
            order by e.createdAt desc
            """)
    List<RecentFeedbackView> findRecentFeedback(org.springframework.data.domain.Pageable pageable);
}
