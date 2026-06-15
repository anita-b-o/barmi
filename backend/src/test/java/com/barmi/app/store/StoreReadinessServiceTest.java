package com.barmi.app.store;

import com.barmi.app.security.StoreAuthorizationService;
import com.barmi.domain.store.Store;
import com.barmi.domain.store.StoreCapability;
import com.barmi.domain.store.StoreCapabilitySetting;
import com.barmi.domain.store.StoreMemberStatus;
import com.barmi.infra.repo.ProductRepository;
import com.barmi.infra.repo.StoreCapabilitySettingRepository;
import com.barmi.infra.repo.StoreMemberRepository;
import com.barmi.infra.repo.StorePromotionRepository;
import com.barmi.infra.repo.StoreShippingZoneRepository;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class StoreReadinessServiceTest {

    private final StoreAuthorizationService authorizationService = mock(StoreAuthorizationService.class);
    private final StoreCapabilityService capabilityService = mock(StoreCapabilityService.class);
    private final StoreCapabilitySettingRepository capabilitySettings = mock(StoreCapabilitySettingRepository.class);
    private final ProductRepository products = mock(ProductRepository.class);
    private final StorePromotionRepository promotions = mock(StorePromotionRepository.class);
    private final StoreShippingZoneRepository shippingZones = mock(StoreShippingZoneRepository.class);
    private final StoreMemberRepository members = mock(StoreMemberRepository.class);
    private final StoreReadinessService service = new StoreReadinessService(
            authorizationService,
            capabilityService,
            capabilitySettings,
            products,
            promotions,
            shippingZones,
            members
    );

    @Test
    void scoresCompletedAndPendingStepsForEcommerceStore() {
        Store store = new Store(UUID.randomUUID(), "demo-store", "Demo Store");
        enable(store, StoreCapability.ABOUT, StoreCapability.CONTACT, StoreCapability.PRODUCTS, StoreCapability.PROMOTIONS, StoreCapability.SHIPPING, StoreCapability.CHECKOUT);
        when(members.existsByStoreIdAndStatus(store.getId(), StoreMemberStatus.ACTIVE)).thenReturn(true);
        when(products.countByStoreIdAndActiveTrue(store.getId())).thenReturn(1L);
        when(promotions.existsByStoreId(store.getId())).thenReturn(false);
        when(shippingZones.existsByStoreId(store.getId())).thenReturn(false);

        StoreReadinessService.StoreReadinessDto readiness = service.evaluate(store);

        assertThat(readiness.score()).isEqualTo(67);
        assertThat(readiness.completedSteps()).contains("store_profile", "contact_info", "first_product", "checkout_enabled");
        assertThat(readiness.pendingSteps()).contains("first_promotion", "shipping_setup");
        assertThat(readiness.blockers()).containsExactly("shipping_setup");
        assertThat(readiness.publishReady()).isFalse();
    }

    @Test
    void institutionalStoreRequiresOnlyProfileAndContactForPublishing() {
        Store store = new Store(UUID.randomUUID(), "about-store", "About Store");
        enable(store, StoreCapability.ABOUT, StoreCapability.CONTACT);
        when(members.existsByStoreIdAndStatus(store.getId(), StoreMemberStatus.ACTIVE)).thenReturn(true);

        StoreReadinessService.StoreReadinessDto readiness = service.evaluate(store);

        assertThat(readiness.score()).isEqualTo(100);
        assertThat(readiness.pendingSteps()).isEmpty();
        assertThat(readiness.blockers()).isEmpty();
        assertThat(readiness.publishReady()).isTrue();
    }

    @Test
    void ecommerceStoreBlocksPublishingWhenCheckoutCapabilityIsMissing() {
        Store store = new Store(UUID.randomUUID(), "products-store", "Products Store");
        enable(store, StoreCapability.ABOUT, StoreCapability.CONTACT, StoreCapability.PRODUCTS, StoreCapability.SHIPPING);
        when(members.existsByStoreIdAndStatus(store.getId(), StoreMemberStatus.ACTIVE)).thenReturn(true);
        when(products.countByStoreIdAndActiveTrue(store.getId())).thenReturn(1L);
        when(shippingZones.existsByStoreId(store.getId())).thenReturn(true);

        StoreReadinessService.StoreReadinessDto readiness = service.evaluate(store);

        assertThat(readiness.pendingSteps()).contains("checkout_enabled");
        assertThat(readiness.blockers()).containsExactly("checkout_enabled");
        assertThat(readiness.publishReady()).isFalse();
    }

    private void enable(Store store, StoreCapability... capabilities) {
        List<StoreCapabilitySetting> settings = List.of(capabilities).stream()
                .map(capability -> new StoreCapabilitySetting(UUID.randomUUID(), store.getId(), capability, true))
                .toList();
        when(capabilitySettings.findAllByStoreIdOrderByCapabilityAsc(store.getId())).thenReturn(settings);
    }
}
