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

        List<StepDefinition> definitions = List.of(
                new StepDefinition("store_profile", StoreCapability.ABOUT, "Información de tu tienda", "Revisar información", "/admin/store", true, true, () -> hasStoreProfile(store)),
                new StepDefinition("contact_info", StoreCapability.CONTACT, "Contacto", "Ir a miembros", "/admin/members", true, true, () -> storeMemberRepository.existsByStoreIdAndStatus(storeId, StoreMemberStatus.ACTIVE)),
                new StepDefinition("first_product", StoreCapability.PRODUCTS, "Primer producto", "Ir a Productos", "/admin/store/products", true, true, () -> productRepository.countByStoreIdAndActiveTrue(storeId) > 0),
                new StepDefinition("first_promotion", StoreCapability.PROMOTIONS, "Primera promoción", "Ir a Promociones", "/admin/store/promotions", false, true, () -> storePromotionRepository.existsByStoreId(storeId)),
                new StepDefinition("shipping_setup", StoreCapability.SHIPPING, "Configurar envíos", "Ir a Envíos", "/admin/shipping/zones", true, true, () -> storeShippingZoneRepository.existsByStoreId(storeId)),
                new StepDefinition("checkout_enabled", StoreCapability.CHECKOUT, "Publicar compras online", "Revisar tienda", "/admin/store/modules", true, true, () -> enabled.contains(StoreCapability.CHECKOUT)),
                new StepDefinition("blog_setup", StoreCapability.BLOG, "Novedades", "Próximamente", null, false, false, () -> false),
                new StepDefinition("gallery_setup", StoreCapability.GALLERY, "Fotos de tu tienda", "Próximamente", null, false, false, () -> false),
                new StepDefinition("reservations_setup", StoreCapability.RESERVATIONS, "Reservas", "Próximamente", null, false, false, () -> false)
        );

        List<ReadinessStepDto> steps = new ArrayList<>();
        for (StepDefinition definition : definitions) {
            if (shouldInclude(definition, enabled, ecommerce)) {
                boolean completed = definition.completed().getAsBoolean();
                boolean blocksPublishing = definition.required()
                        && (definition.capability() == StoreCapability.ABOUT
                        || definition.capability() == StoreCapability.CONTACT
                        || ecommerceCapability(definition.capability()));
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
        long scorableSteps = steps.stream().filter(ReadinessStepDto::implemented).count();
        long completedScorableSteps = steps.stream().filter(step -> step.implemented() && step.completed()).count();
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

    private boolean shouldInclude(StepDefinition definition, EnumSet<StoreCapability> enabled, boolean ecommerce) {
        if (!definition.implemented()) {
            return enabled.contains(definition.capability());
        }
        if (definition.capability() == StoreCapability.CHECKOUT) {
            return ecommerce;
        }
        return enabled.contains(definition.capability());
    }

    private boolean hasStoreProfile(Store store) {
        return store.getName() != null && !store.getName().isBlank()
                && store.getSlug() != null && !store.getSlug().isBlank();
    }

    private boolean ecommerceCapability(StoreCapability capability) {
        return capability == StoreCapability.PRODUCTS
                || capability == StoreCapability.SHIPPING
                || capability == StoreCapability.CHECKOUT;
    }

    private record StepDefinition(
            String id,
            StoreCapability capability,
            String label,
            String ctaLabel,
            String ctaRoute,
            boolean required,
            boolean implemented,
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
