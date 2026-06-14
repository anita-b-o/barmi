package com.barmi.app.saas;

import com.barmi.domain.saas.SaasPlan;
import com.barmi.domain.saas.SaasSubscription;
import com.barmi.domain.saas.SaasSubscriptionStatus;
import com.barmi.domain.store.Store;
import com.barmi.infra.repo.SaasPlanRepository;
import com.barmi.infra.repo.SaasSubscriptionRepository;
import com.barmi.infra.repo.StoreRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Service
public class SaasAdminService {
    private final SaasPlanRepository saasPlanRepository;
    private final SaasSubscriptionRepository saasSubscriptionRepository;
    private final StoreRepository storeRepository;
    private final StoreSaasSubscriptionService storeSaasSubscriptionService;

    public SaasAdminService(
            SaasPlanRepository saasPlanRepository,
            SaasSubscriptionRepository saasSubscriptionRepository,
            StoreRepository storeRepository,
            StoreSaasSubscriptionService storeSaasSubscriptionService
    ) {
        this.saasPlanRepository = saasPlanRepository;
        this.saasSubscriptionRepository = saasSubscriptionRepository;
        this.storeRepository = storeRepository;
        this.storeSaasSubscriptionService = storeSaasSubscriptionService;
    }

    @Transactional(readOnly = true)
    public List<SaasPlan> listPlans() {
        return saasPlanRepository.findAllByOrderByCodeAsc();
    }

    @Transactional
    public SaasPlan createPlan(
            String code,
            String name,
            Boolean active,
            String description,
            Integer maxProducts,
            Boolean analyticsEnabled,
            Boolean seoEnabled
    ) {
        String normalizedCode = normalizeCode(code);
        if (saasPlanRepository.existsByCode(normalizedCode)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "plan_code_already_exists");
        }

        SaasPlan plan = new SaasPlan(
                UUID.randomUUID(),
                normalizedCode,
                requireName(name),
                active == null || active,
                description,
                requireMaxProducts(maxProducts),
                requireBoolean(analyticsEnabled, "analytics_enabled_required"),
                requireBoolean(seoEnabled, "seo_enabled_required")
        );
        return saasPlanRepository.save(plan);
    }

    @Transactional
    public SaasPlan updatePlan(
            UUID planId,
            String name,
            Boolean active,
            String description,
            Integer maxProducts,
            Boolean analyticsEnabled,
            Boolean seoEnabled
    ) {
        SaasPlan plan = saasPlanRepository.findById(planId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "plan_not_found"));
        plan.update(
                requireName(name),
                requireBoolean(active, "active_required"),
                description,
                requireMaxProducts(maxProducts),
                requireBoolean(analyticsEnabled, "analytics_enabled_required"),
                requireBoolean(seoEnabled, "seo_enabled_required")
        );
        return saasPlanRepository.save(plan);
    }

    @Transactional(readOnly = true)
    public List<SaasSubscriptionAdminDto> listSubscriptions() {
        List<SaasSubscription> subscriptions = saasSubscriptionRepository.findAllByOrderByCreatedAtAsc();
        return subscriptions.stream()
                .map(subscription -> {
                    Store store = storeRepository.findById(subscription.getStoreId()).orElse(null);
                    return toDto(subscription, store);
                })
                .sorted(Comparator.comparing(SaasSubscriptionAdminDto::storeSlug, Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER)))
                .toList();
    }

    @Transactional
    public SaasSubscriptionAdminDto changeStorePlan(UUID storeId, UUID planId, String planCode, String statusValue, Instant expiresAt) {
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "store_not_found"));
        SaasSubscription subscription = storeSaasSubscriptionService.ensureSubscriptionForStore(store.getId());
        SaasPlan plan = resolvePlan(planId, planCode);
        SaasSubscriptionStatus status = statusValue == null || statusValue.isBlank()
                ? subscription.getStatus()
                : parseStatus(statusValue);
        subscription.changePlan(plan, status, expiresAt);
        return toDto(saasSubscriptionRepository.save(subscription), store);
    }

    private SaasPlan resolvePlan(UUID planId, String planCode) {
        if (planId != null) {
            return saasPlanRepository.findById(planId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "plan_not_found"));
        }
        String normalizedCode = normalizeCode(planCode);
        return saasPlanRepository.findByCode(normalizedCode)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "plan_not_found"));
    }

    private SaasSubscriptionStatus parseStatus(String statusValue) {
        try {
            return SaasSubscriptionStatus.valueOf(statusValue.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid_subscription_status");
        }
    }

    private String normalizeCode(String value) {
        if (value == null || value.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "plan_not_found");
        }
        return value.trim().toUpperCase();
    }

    private String requireName(String value) {
        if (value == null || value.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "plan_name_required");
        }
        return value.trim();
    }

    private int requireMaxProducts(Integer value) {
        if (value == null || value < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid_max_products");
        }
        return value;
    }

    private boolean requireBoolean(Boolean value, String code) {
        if (value == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, code);
        }
        return value;
    }

    private SaasSubscriptionAdminDto toDto(SaasSubscription subscription, Store store) {
        SaasPlan plan = subscription.getPlan();
        return new SaasSubscriptionAdminDto(
                subscription.getId(),
                subscription.getStoreId(),
                store == null ? null : store.getSlug(),
                store == null ? null : store.getName(),
                plan.getId(),
                plan.getCode(),
                plan.getName(),
                plan.getMaxProducts(),
                plan.isAnalyticsEnabled(),
                plan.isSeoEnabled(),
                subscription.getStatus(),
                subscription.getStartedAt(),
                subscription.getExpiresAt(),
                subscription.getCreatedAt(),
                subscription.getUpdatedAt()
        );
    }

    public record SaasSubscriptionAdminDto(
            UUID subscriptionId,
            UUID storeId,
            String storeSlug,
            String storeName,
            UUID planId,
            String planCode,
            String planName,
            int maxProducts,
            boolean analyticsEnabled,
            boolean seoEnabled,
            SaasSubscriptionStatus status,
            Instant startedAt,
            Instant expiresAt,
            Instant createdAt,
            Instant updatedAt
    ) {}
}
