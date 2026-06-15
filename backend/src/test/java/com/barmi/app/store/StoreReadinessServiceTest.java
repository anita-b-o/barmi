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
        when(products.countByStoreIdAndActiveTrue(store.getId())).thenReturn(1L);
        when(promotions.existsByStoreId(store.getId())).thenReturn(false);
        when(shippingZones.existsByStoreId(store.getId())).thenReturn(false);

        StoreReadinessService.StoreReadinessDto readiness = service.evaluate(store);

        assertThat(readiness.score()).isEqualTo(75);
        assertThat(readiness.completedSteps()).contains("store_profile", "first_product", "checkout_enabled", "store_preview");
        assertThat(readiness.pendingSteps()).contains("first_promotion", "shipping_setup");
        assertThat(readiness.blockers()).containsExactly("shipping_setup");
        assertThat(readiness.publishReady()).isFalse();
        assertThat(readiness.steps()).extracting(StoreReadinessService.ReadinessStepDto::id)
                .containsSequence("store_profile", "first_product", "shipping_setup", "checkout_enabled", "first_promotion", "store_preview");
        assertThat(readiness.steps()).extracting(StoreReadinessService.ReadinessStepDto::label)
                .doesNotContain("Contacto");
    }

    @Test
    void simplePageRequiresOnlyProfileAndContactForPublishing() {
        Store store = new Store(UUID.randomUUID(), "about-store", "About Store");
        enable(store, StoreCapability.ABOUT, StoreCapability.CONTACT);
        when(members.existsByStoreIdAndStatus(store.getId(), StoreMemberStatus.ACTIVE)).thenReturn(true);

        StoreReadinessService.StoreReadinessDto readiness = service.evaluate(store);

        assertThat(readiness.score()).isEqualTo(100);
        assertThat(readiness.pendingSteps()).isEmpty();
        assertThat(readiness.blockers()).isEmpty();
        assertThat(readiness.publishReady()).isTrue();
        assertThat(readiness.steps()).extracting(StoreReadinessService.ReadinessStepDto::id)
                .containsExactly("store_profile", "contact_info", "site_preview");
        assertThat(readiness.steps()).extracting(StoreReadinessService.ReadinessStepDto::id)
                .doesNotContain("first_product", "shipping_setup");
    }

    @Test
    void servicesStoreDoesNotAskForProductsOrShipping() {
        Store store = new Store(UUID.randomUUID(), "services-store", "Services Store");
        enable(store, StoreCapability.ABOUT, StoreCapability.CONTACT, StoreCapability.RESERVATIONS);
        when(members.existsByStoreIdAndStatus(store.getId(), StoreMemberStatus.ACTIVE)).thenReturn(false);

        StoreReadinessService.StoreReadinessDto readiness = service.evaluate(store);

        assertThat(readiness.score()).isEqualTo(50);
        assertThat(readiness.blockers()).containsExactly("contact_info");
        assertThat(readiness.publishReady()).isFalse();
        assertThat(readiness.steps()).extracting(StoreReadinessService.ReadinessStepDto::id)
                .containsExactly("store_profile", "contact_info", "reservations_coming_soon", "site_preview");
        assertThat(readiness.steps()).extracting(StoreReadinessService.ReadinessStepDto::id)
                .doesNotContain("first_product", "shipping_setup");
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

    @Test
    void portfolioWithGalleryDoesNotBlockPublishing() {
        Store store = new Store(UUID.randomUUID(), "portfolio-store", "Portfolio Store");
        enable(store, StoreCapability.ABOUT, StoreCapability.CONTACT, StoreCapability.GALLERY);
        when(members.existsByStoreIdAndStatus(store.getId(), StoreMemberStatus.ACTIVE)).thenReturn(true);

        StoreReadinessService.StoreReadinessDto readiness = service.evaluate(store);

        assertThat(readiness.publishReady()).isTrue();
        assertThat(readiness.blockers()).isEmpty();
        assertThat(readiness.pendingSteps()).containsExactly("gallery_coming_soon");
        assertThat(readiness.steps()).filteredOn(step -> step.id().equals("gallery_coming_soon"))
                .singleElement()
                .satisfies(step -> {
                    assertThat(step.label()).isEqualTo("Galería próximamente");
                    assertThat(step.blocksPublishing()).isFalse();
                    assertThat(step.implemented()).isFalse();
                });
    }

    @Test
    void blogCapabilityDoesNotBlockPublishing() {
        Store store = new Store(UUID.randomUUID(), "blog-store", "Blog Store");
        enable(store, StoreCapability.ABOUT, StoreCapability.CONTACT, StoreCapability.BLOG);
        when(members.existsByStoreIdAndStatus(store.getId(), StoreMemberStatus.ACTIVE)).thenReturn(true);

        StoreReadinessService.StoreReadinessDto readiness = service.evaluate(store);

        assertThat(readiness.publishReady()).isTrue();
        assertThat(readiness.blockers()).isEmpty();
        assertThat(readiness.pendingSteps()).containsExactly("blog_coming_soon");
        assertThat(readiness.steps()).filteredOn(step -> step.id().equals("blog_coming_soon"))
                .singleElement()
                .satisfies(step -> {
                    assertThat(step.label()).isEqualTo("Blog próximamente");
                    assertThat(step.blocksPublishing()).isFalse();
                    assertThat(step.implemented()).isFalse();
                });
    }

    @Test
    void publishReadyMatchesInferredProfile() {
        Store ecommerce = new Store(UUID.randomUUID(), "shop-store", "Shop Store");
        enable(ecommerce, StoreCapability.ABOUT, StoreCapability.CONTACT, StoreCapability.PRODUCTS, StoreCapability.SHIPPING, StoreCapability.CHECKOUT);
        when(products.countByStoreIdAndActiveTrue(ecommerce.getId())).thenReturn(1L);
        when(shippingZones.existsByStoreId(ecommerce.getId())).thenReturn(true);

        Store site = new Store(UUID.randomUUID(), "site-store", "Site Store");
        enable(site, StoreCapability.ABOUT, StoreCapability.CONTACT, StoreCapability.BLOG);
        when(members.existsByStoreIdAndStatus(site.getId(), StoreMemberStatus.ACTIVE)).thenReturn(false);

        assertThat(service.evaluate(ecommerce).publishReady()).isTrue();
        assertThat(service.evaluate(site).publishReady()).isFalse();
        assertThat(service.evaluate(site).blockers()).containsExactly("contact_info");
    }

    private void enable(Store store, StoreCapability... capabilities) {
        List<StoreCapabilitySetting> settings = List.of(capabilities).stream()
                .map(capability -> new StoreCapabilitySetting(UUID.randomUUID(), store.getId(), capability, true))
                .toList();
        when(capabilitySettings.findAllByStoreIdOrderByCapabilityAsc(store.getId())).thenReturn(settings);
    }
}
