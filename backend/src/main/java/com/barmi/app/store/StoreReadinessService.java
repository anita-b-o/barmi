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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.UUID;
import java.util.function.BooleanSupplier;

@Service
@Transactional(readOnly = true)
public class StoreReadinessService {

    private final StoreAuthorizationService storeAuthorizationService;
    private final StoreCapabilityService storeCapabilityService;
    private final StoreCapabilitySettingRepository storeCapabilitySettingRepository;
    private final ProductRepository productRepository;
    private final StorePromotionRepository storePromotionRepository;
    private final StoreShippingZoneRepository storeShippingZoneRepository;
    private final StoreMemberRepository storeMemberRepository;

    public StoreReadinessService(
            StoreAuthorizationService storeAuthorizationService,
            StoreCapabilityService storeCapabilityService,
            StoreCapabilitySettingRepository storeCapabilitySettingRepository,
            ProductRepository productRepository,
            StorePromotionRepository storePromotionRepository,
            StoreShippingZoneRepository storeShippingZoneRepository,
            StoreMemberRepository storeMemberRepository
    ) {
        this.storeAuthorizationService = storeAuthorizationService;
        this.storeCapabilityService = storeCapabilityService;
        this.storeCapabilitySettingRepository = storeCapabilitySettingRepository;
        this.productRepository = productRepository;
        this.storePromotionRepository = storePromotionRepository;
        this.storeShippingZoneRepository = storeShippingZoneRepository;
        this.storeMemberRepository = storeMemberRepository;
    }

    public StoreReadinessDto getCurrentStoreReadiness() {
        storeAuthorizationService.requireAdmin();
        Store store = storeAuthorizationService.requireCurrentStore();
        storeCapabilityService.ensureDefaults(store.getId());
        return evaluate(store);
    }

    StoreReadinessDto evaluate(Store store) {
        UUID storeId = store.getId();
        EnumSet<StoreCapability> enabled = enabledCapabilities(storeId);
        boolean ecommerce = enabled.contains(StoreCapability.PRODUCTS)
                || enabled.contains(StoreCapability.SHIPPING)
                || enabled.contains(StoreCapability.CHECKOUT);

        List<StepDefinition> definitions = ecommerce
                ? ecommerceDefinitions(store, storeId, enabled)
                : siteDefinitions(store, storeId, enabled);

        List<ReadinessStepDto> steps = new ArrayList<>();
        for (StepDefinition definition : definitions) {
            if (shouldInclude(definition, enabled)) {
                boolean completed = definition.completed().getAsBoolean();
                boolean blocksPublishing = definition.blocksPublishing();
                steps.add(new ReadinessStepDto(
                        definition.id(),
                        definition.capability().name(),
                        definition.label(),
                        definition.ctaLabel(),
                        definition.ctaRoute(),
                        definition.required(),
                        blocksPublishing,
                        definition.implemented(),
                        completed
                ));
            }
        }

        List<String> completedSteps = steps.stream()
                .filter(ReadinessStepDto::completed)
                .map(ReadinessStepDto::id)
                .toList();
        List<String> pendingSteps = steps.stream()
                .filter(step -> !step.completed())
                .map(ReadinessStepDto::id)
                .toList();
        List<String> blockers = steps.stream()
                .filter(step -> step.blocksPublishing() && !step.completed())
                .map(ReadinessStepDto::id)
                .toList();
        long scorableSteps = definitions.stream().filter(StepDefinition::scoreable).count();
        long completedScorableSteps = definitions.stream()
                .filter(definition -> definition.scoreable() && definition.completed().getAsBoolean())
                .count();
        int score = scorableSteps == 0 ? 100 : (int) Math.round((completedScorableSteps * 100.0) / scorableSteps);

        return new StoreReadinessDto(
                score,
                completedSteps,
                pendingSteps,
                blockers,
                blockers.isEmpty(),
                enabled.stream().map(Enum::name).toList(),
                steps
        );
    }

    private EnumSet<StoreCapability> enabledCapabilities(UUID storeId) {
        EnumSet<StoreCapability> enabled = EnumSet.noneOf(StoreCapability.class);
        for (StoreCapabilitySetting setting : storeCapabilitySettingRepository.findAllByStoreIdOrderByCapabilityAsc(storeId)) {
            if (setting.isEnabled()) {
                enabled.add(setting.getCapability());
            }
        }
        return enabled;
    }

    private boolean shouldInclude(StepDefinition definition, EnumSet<StoreCapability> enabled) {
        return definition.alwaysVisible() || enabled.contains(definition.capability());
    }

    private boolean hasStoreProfile(Store store) {
        return store.getName() != null && !store.getName().isBlank()
                && store.getSlug() != null && !store.getSlug().isBlank();
    }

    private List<StepDefinition> ecommerceDefinitions(Store store, UUID storeId, EnumSet<StoreCapability> enabled) {
        List<StepDefinition> definitions = new ArrayList<>();
        definitions.add(new StepDefinition("store_profile", StoreCapability.ABOUT, "Perfil de tu tienda", "Revisar perfil", "/admin/store", true, true, true, true, true, () -> hasStoreProfile(store)));
        definitions.add(new StepDefinition("first_product", StoreCapability.PRODUCTS, "Primer producto", "Crear producto", "/admin/store/products", true, true, true, true, true, () -> productRepository.countByStoreIdAndActiveTrue(storeId) > 0));
        definitions.add(new StepDefinition("shipping_setup", StoreCapability.SHIPPING, "Envíos", "Configurar envíos", "/admin/shipping/zones", true, true, true, true, true, () -> storeShippingZoneRepository.existsByStoreId(storeId)));
        definitions.add(new StepDefinition("checkout_enabled", StoreCapability.CHECKOUT, "Compras online", "Elegir tipo de sitio", "/admin/store/modules", true, true, true, true, true, () -> enabled.contains(StoreCapability.CHECKOUT)));
        if (enabled.contains(StoreCapability.PROMOTIONS)) {
            definitions.add(new StepDefinition("first_promotion", StoreCapability.PROMOTIONS, "Promociones", "Crear promoción", "/admin/store/promotions", false, false, true, false, false, () -> storePromotionRepository.existsByStoreId(storeId)));
        }
        definitions.addAll(futureDefinitions(enabled));
        definitions.add(new StepDefinition("store_preview", StoreCapability.ABOUT, "Vista previa de tu tienda", "Ver tienda", "/public/" + store.getSlug(), false, false, true, false, true, () -> true));
        return definitions;
    }

    private List<StepDefinition> siteDefinitions(Store store, UUID storeId, EnumSet<StoreCapability> enabled) {
        List<StepDefinition> definitions = new ArrayList<>();
        definitions.add(new StepDefinition("store_profile", StoreCapability.ABOUT, "Perfil de tu sitio", "Revisar perfil", "/admin/store", true, true, true, true, true, () -> hasStoreProfile(store)));
        definitions.add(new StepDefinition("contact_info", StoreCapability.CONTACT, "Contacto", "Gestionar contacto", "/admin/members", true, true, true, true, true, () -> storeMemberRepository.existsByStoreIdAndStatus(storeId, StoreMemberStatus.ACTIVE)));
        definitions.addAll(futureDefinitions(enabled));
        definitions.add(new StepDefinition("site_preview", StoreCapability.ABOUT, "Vista previa de tu sitio", "Ver sitio", "/public/" + store.getSlug(), false, false, true, false, true, () -> true));
        return definitions;
    }

    private List<StepDefinition> futureDefinitions(EnumSet<StoreCapability> enabled) {
        List<StepDefinition> definitions = new ArrayList<>();
        if (enabled.contains(StoreCapability.GALLERY)) {
            definitions.add(new StepDefinition("gallery_coming_soon", StoreCapability.GALLERY, "Galería próximamente", "Próximamente", null, false, false, false, false, false, () -> false));
        }
        if (enabled.contains(StoreCapability.BLOG)) {
            definitions.add(new StepDefinition("blog_coming_soon", StoreCapability.BLOG, "Blog próximamente", "Próximamente", null, false, false, false, false, false, () -> false));
        }
        if (enabled.contains(StoreCapability.RESERVATIONS)) {
            definitions.add(new StepDefinition("reservations_coming_soon", StoreCapability.RESERVATIONS, "Reservas próximamente", "Próximamente", null, false, false, false, false, false, () -> false));
        }
        return definitions;
    }

    private record StepDefinition(
            String id,
            StoreCapability capability,
            String label,
            String ctaLabel,
            String ctaRoute,
            boolean required,
            boolean blocksPublishing,
            boolean implemented,
            boolean scoreable,
            boolean alwaysVisible,
            BooleanSupplier completed
    ) {}

    public record StoreReadinessDto(
            int score,
            List<String> completedSteps,
            List<String> pendingSteps,
            List<String> blockers,
            boolean publishReady,
            List<String> enabledCapabilities,
            List<ReadinessStepDto> steps
    ) {}

    public record ReadinessStepDto(
            String id,
            String capability,
            String label,
            String ctaLabel,
            String ctaRoute,
            boolean required,
            boolean blocksPublishing,
            boolean implemented,
            boolean completed
    ) {}
}
