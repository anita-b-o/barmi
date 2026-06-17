package com.barmi.app.devdata;

import com.barmi.infra.repo.EcosystemExternalProductRepository;
import com.barmi.infra.repo.EcosystemFulfillmentRepository;
import com.barmi.infra.repo.EcosystemOrderRepository;
import com.barmi.infra.repo.EcosystemPromotionRepository;
import com.barmi.infra.repo.EcosystemRepository;
import com.barmi.infra.repo.ProductRepository;
import com.barmi.infra.repo.StoreCapabilitySettingRepository;
import com.barmi.infra.repo.StoreCategoryRepository;
import com.barmi.infra.repo.StoreFulfillmentRepository;
import com.barmi.infra.repo.StoreOrderItemRepository;
import com.barmi.infra.repo.StoreOrderRepository;
import com.barmi.infra.repo.StorePromotionRepository;
import com.barmi.infra.repo.StoreRepository;
import com.barmi.infra.repo.StoreShippingZoneRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@ExtendWith(MockitoExtension.class)
class DemoSeedServiceTest {

    @Mock StoreRepository storeRepository;
    @Mock ProductRepository productRepository;
    @Mock StoreCategoryRepository storeCategoryRepository;
    @Mock StorePromotionRepository storePromotionRepository;
    @Mock StoreShippingZoneRepository storeShippingZoneRepository;
    @Mock StoreCapabilitySettingRepository storeCapabilitySettingRepository;
    @Mock StoreOrderRepository storeOrderRepository;
    @Mock StoreOrderItemRepository storeOrderItemRepository;
    @Mock StoreFulfillmentRepository storeFulfillmentRepository;
    @Mock EcosystemRepository ecosystemRepository;
    @Mock EcosystemExternalProductRepository ecosystemExternalProductRepository;
    @Mock EcosystemPromotionRepository ecosystemPromotionRepository;
    @Mock EcosystemOrderRepository ecosystemOrderRepository;
    @Mock EcosystemFulfillmentRepository ecosystemFulfillmentRepository;
    @Test
    void listsOfficialScenarios() {
        DemoSeedService service = service();

        assertThat(service.listScenarios())
                .extracting(DemoSeedService.SeedScenarioDto::key)
                .containsExactly("ecommerce", "services", "portfolio", "new-store", "ecosystem", "all");
    }

    @Test
    void rejectsUnknownScenario() {
        DemoSeedService service = service();

        assertThatThrownBy(() -> service.seed("missing"))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("unknown_seed_scenario");
    }

    private DemoSeedService service() {
        return new DemoSeedService(
                storeRepository,
                productRepository,
                storeCategoryRepository,
                storePromotionRepository,
                storeShippingZoneRepository,
                storeCapabilitySettingRepository,
                storeOrderRepository,
                storeOrderItemRepository,
                storeFulfillmentRepository,
                ecosystemRepository,
                ecosystemExternalProductRepository,
                ecosystemPromotionRepository,
                ecosystemOrderRepository,
                ecosystemFulfillmentRepository
        );
    }
}
