package com.barmi.app.beta;

import com.barmi.app.store.StoreCapabilityService;
import com.barmi.app.store.StoreReadinessService;
import com.barmi.domain.store.Store;
import com.barmi.infra.repo.StoreRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Service
@Transactional(readOnly = true)
public class BetaLaunchToolkitService {

    private final StoreRepository storeRepository;
    private final StoreReadinessService storeReadinessService;
    private final StoreCapabilityService storeCapabilityService;

    public BetaLaunchToolkitService(
            StoreRepository storeRepository,
            StoreReadinessService storeReadinessService,
            StoreCapabilityService storeCapabilityService
    ) {
        this.storeRepository = storeRepository;
        this.storeReadinessService = storeReadinessService;
        this.storeCapabilityService = storeCapabilityService;
    }

    public List<BetaStoreDto> stores() {
        return storeRepository.findAll().stream()
                .map(this::toDto)
                .sorted(Comparator
                        .comparing(BetaStoreDto::publishReady).reversed()
                        .thenComparing(BetaStoreDto::readinessScore, Comparator.reverseOrder())
                        .thenComparing(BetaStoreDto::storeName, String.CASE_INSENSITIVE_ORDER))
                .toList();
    }

    private BetaStoreDto toDto(Store store) {
        StoreReadinessService.StoreReadinessDto readiness = storeReadinessService.evaluate(store);
        return new BetaStoreDto(
                store.getId(),
                store.getSlug(),
                store.getName(),
                readiness.score(),
                readiness.publishReady(),
                classify(readiness.score(), readiness.publishReady()),
                store.getAppearancePreset().name(),
                storeCapabilityService.getEnabledCapabilityNamesForStore(store.getId()),
                store.getCreatedAt()
        );
    }

    BetaStatus classify(int readinessScore, boolean publishReady) {
        if (publishReady) {
            return BetaStatus.READY;
        }
        if (readinessScore <= 0) {
            return BetaStatus.NOT_STARTED;
        }
        return BetaStatus.IN_PROGRESS;
    }

    public enum BetaStatus {
        READY,
        IN_PROGRESS,
        NOT_STARTED
    }

    public record BetaStoreDto(
            UUID storeId,
            String storeSlug,
            String storeName,
            int readinessScore,
            boolean publishReady,
            BetaStatus betaStatus,
            String appearancePreset,
            List<String> capabilitiesEnabled,
            Instant createdAt
    ) {}
}
