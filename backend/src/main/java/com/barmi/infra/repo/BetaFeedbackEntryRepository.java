package com.barmi.infra.repo;

import com.barmi.domain.beta.BetaFeedbackEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

public interface BetaFeedbackEntryRepository extends JpaRepository<BetaFeedbackEntry, UUID> {

    interface CategoryCountView {
        String getCategory();
        long getTotal();
    }

    @Query("""
            select e.category as category, count(e) as total
            from BetaFeedbackEntry e
            group by e.category
            """)
    List<CategoryCountView> countAllByCategory();
}
