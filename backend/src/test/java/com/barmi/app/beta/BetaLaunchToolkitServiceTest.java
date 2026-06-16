package com.barmi.app.beta;

import com.barmi.app.store.StoreCapabilityService;
import com.barmi.app.store.StoreReadinessService;
import com.barmi.domain.store.Store;
import com.barmi.infra.repo.StoreRepository;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class BetaLaunchToolkitServiceTest {

    private final StoreRepository storeRepository = mock(StoreRepository.class);
    private final StoreReadinessService storeReadinessService = mock(StoreReadinessService.class);
    private final StoreCapabilityService storeCapabilityService = mock(StoreCapabilityService.class);
    private final BetaLaunchToolkitService service = new BetaLaunchToolkitService(
            storeRepository,
            storeReadinessService,
            storeCapabilityService
    );

    @Test
    void ordersReadyStoresFirstThenScoreDescending() {
        Store inProgressHigh = store("in-progress-high", "In Progress High");
        Store readyLow = store("ready-low", "Ready Low");
        Store notStarted = store("not-started", "Not Started");
        Store inProgressLow = store("in-progress-low", "In Progress Low");

        when(storeRepository.findAll()).thenReturn(List.of(inProgressHigh, notStarted, readyLow, inProgressLow));
        readiness(inProgressHigh, 90, false);
        readiness(readyLow, 50, true);
        readiness(notStarted, 0, false);
        readiness(inProgressLow, 40, false);

        List<BetaLaunchToolkitService.BetaStoreDto> stores = service.stores();

        assertThat(stores).extracting(BetaLaunchToolkitService.BetaStoreDto::storeSlug)
                .containsExactly("ready-low", "in-progress-high", "in-progress-low", "not-started");
    }

    @Test
    void classifiesStoresFromReadinessState() {
        assertThat(service.classify(100, true)).isEqualTo(BetaLaunchToolkitService.BetaStatus.READY);
        assertThat(service.classify(1, false)).isEqualTo(BetaLaunchToolkitService.BetaStatus.IN_PROGRESS);
        assertThat(service.classify(0, false)).isEqualTo(BetaLaunchToolkitService.BetaStatus.NOT_STARTED);
    }

    private Store store(String slug, String name) {
        Store store = new Store(UUID.randomUUID(), slug, name);
        when(storeCapabilityService.getEnabledCapabilityNamesForStore(store.getId())).thenReturn(List.of("ABOUT"));
        return store;
    }

    private void readiness(Store store, int score, boolean publishReady) {
        when(storeReadinessService.evaluate(store)).thenReturn(new StoreReadinessService.StoreReadinessDto(
                score,
                List.of(),
                List.of(),
                publishReady ? List.of() : List.of("store_profile"),
                publishReady,
                List.of("ABOUT"),
                List.of()
        ));
    }
}
