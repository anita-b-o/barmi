package com.barmi.app.saas;

import com.barmi.domain.saas.SaasPlan;
import com.barmi.domain.saas.SaasSubscription;
import com.barmi.domain.saas.SaasSubscriptionStatus;
import com.barmi.infra.repo.SaasPlanRepository;
import com.barmi.infra.repo.SaasSubscriptionRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.UUID;

@Service
public class StoreSaasSubscriptionService {
    public static final String FREE_PLAN_CODE = "FREE";

    private final SaasPlanRepository saasPlanRepository;
    private final SaasSubscriptionRepository saasSubscriptionRepository;

    public StoreSaasSubscriptionService(
            SaasPlanRepository saasPlanRepository,
            SaasSubscriptionRepository saasSubscriptionRepository
    ) {
        this.saasPlanRepository = saasPlanRepository;
        this.saasSubscriptionRepository = saasSubscriptionRepository;
    }

    @Transactional
    public SaasSubscription ensureSubscriptionForStore(UUID storeId) {
        if (storeId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "store_not_found");
        }

        return saasSubscriptionRepository.findByStoreId(storeId)
                .orElseGet(() -> {
                    SaasPlan freePlan = saasPlanRepository.findByCode(FREE_PLAN_CODE)
                            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "plan_not_found"));
                    SaasSubscription subscription = new SaasSubscription(
                            UUID.randomUUID(),
                            storeId,
                            freePlan,
                            SaasSubscriptionStatus.ACTIVE,
                            Instant.now(),
                            null
                    );
                    return saasSubscriptionRepository.save(subscription);
                });
    }
}
