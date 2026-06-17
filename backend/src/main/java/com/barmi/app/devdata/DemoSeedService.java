package com.barmi.app.devdata;

import com.barmi.domain.catalog.Product;
import com.barmi.domain.catalog.StoreCategory;
import com.barmi.domain.catalog.StorePromotion;
import com.barmi.domain.catalog.StorePromotionType;
import com.barmi.domain.ecosystem.Ecosystem;
import com.barmi.domain.ecosystem.EcosystemExternalProduct;
import com.barmi.domain.ecosystem.EcosystemPromotion;
import com.barmi.domain.ecosystem.EcosystemPromotionType;
import com.barmi.domain.fulfillment.FulfillmentStatus;
import com.barmi.domain.fulfillment.EcosystemFulfillment;
import com.barmi.domain.fulfillment.StoreFulfillment;
import com.barmi.domain.orders.EcosystemOrder;
import com.barmi.domain.orders.EcosystemOrderItem;
import com.barmi.domain.orders.StoreOrder;
import com.barmi.domain.orders.StoreOrderItem;
import com.barmi.domain.shipping.ShippingZoneType;
import com.barmi.domain.shipping.StoreShippingZone;
import com.barmi.domain.store.Store;
import com.barmi.domain.store.StoreAppearancePreset;
import com.barmi.domain.store.StoreCapability;
import com.barmi.domain.store.StoreCapabilitySetting;
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
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@Service
@Profile({"local", "dev", "test", "integrationtest"})
public class DemoSeedService {

    private static final String CURRENCY = "ARS";
    private static final List<String> SCENARIOS = List.of("ecommerce", "services", "portfolio", "new-store", "ecosystem", "all");

    private final StoreRepository storeRepository;
    private final ProductRepository productRepository;
    private final StoreCategoryRepository storeCategoryRepository;
    private final StorePromotionRepository storePromotionRepository;
    private final StoreShippingZoneRepository storeShippingZoneRepository;
    private final StoreCapabilitySettingRepository storeCapabilitySettingRepository;
    private final StoreOrderRepository storeOrderRepository;
    private final StoreOrderItemRepository storeOrderItemRepository;
    private final StoreFulfillmentRepository storeFulfillmentRepository;
    private final EcosystemRepository ecosystemRepository;
    private final EcosystemExternalProductRepository ecosystemExternalProductRepository;
    private final EcosystemPromotionRepository ecosystemPromotionRepository;
    private final EcosystemOrderRepository ecosystemOrderRepository;
    private final EcosystemFulfillmentRepository ecosystemFulfillmentRepository;

    public DemoSeedService(
            StoreRepository storeRepository,
            ProductRepository productRepository,
            StoreCategoryRepository storeCategoryRepository,
            StorePromotionRepository storePromotionRepository,
            StoreShippingZoneRepository storeShippingZoneRepository,
            StoreCapabilitySettingRepository storeCapabilitySettingRepository,
            StoreOrderRepository storeOrderRepository,
            StoreOrderItemRepository storeOrderItemRepository,
            StoreFulfillmentRepository storeFulfillmentRepository,
            EcosystemRepository ecosystemRepository,
            EcosystemExternalProductRepository ecosystemExternalProductRepository,
            EcosystemPromotionRepository ecosystemPromotionRepository,
            EcosystemOrderRepository ecosystemOrderRepository,
            EcosystemFulfillmentRepository ecosystemFulfillmentRepository
    ) {
        this.storeRepository = storeRepository;
        this.productRepository = productRepository;
        this.storeCategoryRepository = storeCategoryRepository;
        this.storePromotionRepository = storePromotionRepository;
        this.storeShippingZoneRepository = storeShippingZoneRepository;
        this.storeCapabilitySettingRepository = storeCapabilitySettingRepository;
        this.storeOrderRepository = storeOrderRepository;
        this.storeOrderItemRepository = storeOrderItemRepository;
        this.storeFulfillmentRepository = storeFulfillmentRepository;
        this.ecosystemRepository = ecosystemRepository;
        this.ecosystemExternalProductRepository = ecosystemExternalProductRepository;
        this.ecosystemPromotionRepository = ecosystemPromotionRepository;
        this.ecosystemOrderRepository = ecosystemOrderRepository;
        this.ecosystemFulfillmentRepository = ecosystemFulfillmentRepository;
    }

    public List<SeedScenarioDto> listScenarios() {
        return List.of(
                new SeedScenarioDto("ecommerce", "Casa Roja", "Online store ready for publishing, catalog, shipping, orders and analytics."),
                new SeedScenarioDto("services", "Estudio Fernandez", "Services site with profile and contact, no ecommerce."),
                new SeedScenarioDto("portfolio", "Ana Fotografia", "Portfolio site with long description and contact, no ecommerce."),
                new SeedScenarioDto("new-store", "Mi nueva tienda", "Almost empty store for first run onboarding."),
                new SeedScenarioDto("ecosystem", "Ecosystem demo", "Marketplace discovery, stores, products, promotions, orders and analytics."),
                new SeedScenarioDto("all", "All demo scenarios", "Runs every official demo scenario idempotently.")
        );
    }

    @Transactional
    public SeedResult seed(String scenario) {
        String normalized = scenario == null ? "" : scenario.trim().toLowerCase(Locale.ROOT);
        return switch (normalized) {
            case "ecommerce" -> seedEcommerce();
            case "services" -> seedServices();
            case "portfolio" -> seedPortfolio();
            case "new-store" -> seedNewStore();
            case "ecosystem" -> seedEcosystem();
            case "all" -> seedEcommerce().plus(seedServices()).plus(seedPortfolio()).plus(seedNewStore()).plus(seedEcosystem());
            default -> throw new ResponseStatusException(HttpStatus.NOT_FOUND, "unknown_seed_scenario");
        };
    }

    private SeedResult seedEcommerce() {
        SeedCounters counters = new SeedCounters();
        Store store = upsertStore(
                counters,
                "casa-roja",
                "Casa Roja",
                null,
                "Palermo, Ciudad de Buenos Aires",
                "-34.584000",
                "-58.424000",
                "almacen",
                "Casa Roja es una tienda local de objetos para la casa, bazar contemporaneo y regalos seleccionados.",
                "hola@casaroja.demo",
                "+54 11 4000-1000",
                "+54 9 11 4000-1000",
                StoreAppearancePreset.LOCAL_BUSINESS
        );
        setCapabilities(store.getId(), EnumSet.of(
                StoreCapability.ABOUT,
                StoreCapability.CONTACT,
                StoreCapability.PRODUCTS,
                StoreCapability.PROMOTIONS,
                StoreCapability.SHIPPING,
                StoreCapability.CHECKOUT
        ));

        List<StoreCategory> categories = upsertCategories(counters, store, List.of("Bazar", "Textiles", "Deco"));
        List<Product> products = upsertProducts(counters, store, "CR", List.of(
                "Taza gres rojo", "Set platos Lisboa", "Jarra vidrio ambar", "Mate ceramica", "Tabla lenga",
                "Repasador rayado", "Mantel lino natural", "Almohadon bosque", "Manta waffle", "Camino de mesa",
                "Vela cedro", "Florero bajo", "Lampara mesa Alba", "Canasto junco", "Marco madera",
                "Espejo circular", "Difusor verbena", "Bandeja laqueada", "Cuenco piedra", "Organizador metal"
        ), categories);
        upsertStorePromotions(counters, store, List.of("CASA10", "ENVIO500"));
        List<StoreShippingZone> zones = upsertShippingZones(counters, store);
        upsertStoreOrders(counters, store, products, zones, "ecommerce", 15);
        return counters.toResult();
    }

    private SeedResult seedServices() {
        SeedCounters counters = new SeedCounters();
        Store store = upsertStore(
                counters,
                "estudio-fernandez",
                "Estudio Fernandez",
                null,
                "Centro, Cordoba",
                "-31.416700",
                "-64.183300",
                null,
                "Estudio Fernandez acompana a pymes y profesionales con asesoramiento contable, impositivo y gestion administrativa.",
                "contacto@estudiofernandez.demo",
                "+54 351 555-0100",
                "+54 9 351 555-0100",
                StoreAppearancePreset.CLASSIC
        );
        setCapabilities(store.getId(), EnumSet.of(StoreCapability.ABOUT, StoreCapability.CONTACT));
        return counters.toResult();
    }

    private SeedResult seedPortfolio() {
        SeedCounters counters = new SeedCounters();
        Store store = upsertStore(
                counters,
                "ana-fotografia",
                "Ana Fotografia",
                null,
                "Rosario, Santa Fe",
                "-32.946800",
                "-60.639300",
                null,
                "Ana Fotografia desarrolla sesiones editoriales, retratos familiares y cobertura de eventos con una mirada calida, documental y cuidada. El portfolio reune trabajos para marcas independientes, artistas y celebraciones intimas, priorizando luz natural, direccion amable y entrega digital lista para compartir.",
                "hola@anafotografia.demo",
                "+54 341 555-0180",
                "+54 9 341 555-0180",
                StoreAppearancePreset.PORTFOLIO
        );
        setCapabilities(store.getId(), EnumSet.of(StoreCapability.ABOUT, StoreCapability.CONTACT));
        return counters.toResult();
    }

    private SeedResult seedNewStore() {
        SeedCounters counters = new SeedCounters();
        Store store = upsertStore(
                counters,
                "mi-nueva-tienda",
                "Mi nueva tienda",
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                StoreAppearancePreset.MODERN
        );
        setCapabilities(store.getId(), EnumSet.noneOf(StoreCapability.class));
        return counters.toResult();
    }

    private SeedResult seedEcosystem() {
        SeedCounters counters = new SeedCounters();
        Ecosystem ecosystem = upsertEcosystem(counters, "ecosystem-demo", "Ecosystem demo");
        upsertEcosystemPromotions(counters, ecosystem, List.of("ECO10", "BIENVENIDA"));

        List<EcosystemStoreSpec> specs = List.of(
                new EcosystemStoreSpec("verde-mercado", "Verde Mercado", "verduleria", "Almacen natural, frutas de estacion y productos saludables.", "-34.603700", "-58.381600"),
                new EcosystemStoreSpec("nube-indumentaria", "Nube Indumentaria", "almacen", "Ropa urbana, prendas basicas y accesorios seleccionados.", "-34.609000", "-58.392000"),
                new EcosystemStoreSpec("taller-norte", "Taller Norte", "kiosco", "Reparaciones, mantenimiento y soluciones tecnicas para el hogar.", "-34.580000", "-58.430000"),
                new EcosystemStoreSpec("flora-estudio", "Flora Estudio", "panaderia", "Flores, ambientaciones y objetos vivos para regalar.", "-34.571000", "-58.440000"),
                new EcosystemStoreSpec("punto-tech", "Punto Tech", "kiosco", "Accesorios de tecnologia, cables, audio y gadgets utiles.", "-34.615000", "-58.405000"),
                new EcosystemStoreSpec("libros-sur", "Libros Sur", "libreria", "Libreria independiente con novedades, clasicos y agenda cultural.", "-34.620000", "-58.370000"),
                new EcosystemStoreSpec("cafe-laguna", "Cafe Laguna", "cafeteria", "Cafe de especialidad, pasteleria y granos para casa.", "-34.590000", "-58.415000"),
                new EcosystemStoreSpec("muebles-claro", "Muebles Claro", "almacen", "Muebles compactos, organizacion y decoracion funcional.", "-34.599000", "-58.455000"),
                new EcosystemStoreSpec("bienestar-uno", "Bienestar Uno", "farmacia", "Productos de cuidado personal y bienestar cotidiano.", "-34.632000", "-58.410000"),
                new EcosystemStoreSpec("arte-minimo", "Arte Minimo", "libreria", "Laminas, ceramicas y piezas de artistas locales.")
        );

        List<Product> productsForOrders = new ArrayList<>();
        int storeIndex = 1;
        for (EcosystemStoreSpec spec : specs) {
            Store store = upsertStore(
                    counters,
                    spec.slug(),
                    spec.name(),
                    ecosystem,
                    spec.name() + " showroom",
                    spec.latitude(),
                    spec.longitude(),
                    spec.categoryKey(),
                    spec.description(),
                    "hola@" + spec.slug() + ".demo",
                    "+54 11 5555-" + String.format("%04d", storeIndex),
                    "+54 9 11 5555-" + String.format("%04d", storeIndex),
                    StoreAppearancePreset.LOCAL_BUSINESS
            );
            setCapabilities(store.getId(), EnumSet.of(
                    StoreCapability.ABOUT,
                    StoreCapability.CONTACT,
                    StoreCapability.PRODUCTS,
                    StoreCapability.PROMOTIONS,
                    StoreCapability.CHECKOUT
            ));
            List<StoreCategory> categories = upsertCategories(counters, store, List.of("Destacados", "Novedades"));
            productsForOrders.addAll(upsertProducts(counters, store, "ECO" + storeIndex, List.of(
                    spec.name() + " destacado",
                    spec.name() + " seleccion",
                    spec.name() + " regalo"
            ), categories));
            upsertStorePromotions(counters, store, List.of("DEMO" + storeIndex));
            storeIndex++;
        }

        List<EcosystemExternalProduct> ecosystemProducts = upsertEcosystemExternalProducts(counters, ecosystem, specs);
        upsertEcosystemOrders(counters, ecosystem, ecosystemProducts, 12);
        upsertStoreOrders(counters, storeRepository.findBySlug("verde-mercado").orElseThrow(), productsForOrders.subList(0, 6), List.of(), "ecosystem-store", 8);
        return counters.toResult();
    }

    private Store upsertStore(
            SeedCounters counters,
            String slug,
            String name,
            Ecosystem ecosystem,
            String location,
            String latitude,
            String longitude,
            String categoryKey,
            String description,
            String email,
            String phone,
            String whatsapp,
            StoreAppearancePreset appearance
    ) {
        Store store = storeRepository.findBySlug(slug).orElseGet(() -> {
            counters.createdStores++;
            return new Store(id("store:" + slug), slug, name);
        });
        store.updateEcosystem(ecosystem);
        store.updatePublicLocation(location, decimalOrNull(latitude), decimalOrNull(longitude));
        store.updatePublicCategoryKey(categoryKey);
        store.updatePublicProfile(description, email, phone, whatsapp);
        store.updateAppearancePreset(appearance);
        return storeRepository.saveAndFlush(store);
    }

    private Ecosystem upsertEcosystem(SeedCounters counters, String slug, String name) {
        return ecosystemRepository.findBySlug(slug).orElseGet(() -> {
            counters.createdEcosystems++;
            return ecosystemRepository.save(new Ecosystem(id("ecosystem:" + slug), name, slug));
        });
    }

    private void setCapabilities(UUID storeId, EnumSet<StoreCapability> enabled) {
        for (StoreCapability capability : StoreCapability.values()) {
            StoreCapabilitySetting setting = storeCapabilitySettingRepository.findByStoreIdAndCapability(storeId, capability)
                    .orElseGet(() -> new StoreCapabilitySetting(id("capability:" + storeId + ":" + capability), storeId, capability, false));
            setting.setEnabled(enabled.contains(capability));
            storeCapabilitySettingRepository.save(setting);
        }
    }

    private List<StoreCategory> upsertCategories(SeedCounters counters, Store store, List<String> names) {
        List<StoreCategory> categories = new ArrayList<>();
        int index = 0;
        for (String name : names) {
            int sortOrder = index++;
            StoreCategory category = storeCategoryRepository.findByStoreIdAndNameIgnoreCase(store.getId(), name)
                    .orElseGet(() -> {
                        counters.createdCategories++;
                        return new StoreCategory(id("category:" + store.getSlug() + ":" + name), store.getId(), name, true, sortOrder);
                    });
            category.updateName(name);
            category.updateSortOrder(sortOrder);
            category.setActive(true);
            categories.add(storeCategoryRepository.save(category));
        }
        return categories;
    }

    private List<Product> upsertProducts(SeedCounters counters, Store store, String skuPrefix, List<String> names, List<StoreCategory> categories) {
        List<Product> products = new ArrayList<>();
        for (int i = 0; i < names.size(); i++) {
            final int productIndex = i;
            String sku = skuPrefix + "-" + String.format("%03d", i + 1);
            String name = names.get(i);
            long price = 2500L + (i * 775L);
            UUID categoryId = categories.isEmpty() ? null : categories.get(i % categories.size()).getId();
            Product product = productRepository.findByStoreIdAndSku(store.getId(), sku)
                    .orElseGet(() -> {
                        counters.createdProducts++;
                        return new Product(id("product:" + store.getSlug() + ":" + sku), store.getId(), sku, name, price, 30 + productIndex, categoryId);
                    });
            product.updateName(name);
            product.updatePriceCents(price);
            product.updateStockQuantity(30 + i);
            product.updateCategoryId(categoryId);
            product.setActive(true);
            products.add(productRepository.save(product));
        }
        return products;
    }

    private void upsertStorePromotions(SeedCounters counters, Store store, List<String> codes) {
        for (int i = 0; i < codes.size(); i++) {
            final int promotionIndex = i;
            String code = codes.get(i);
            StorePromotion promotion = storePromotionRepository.findByStoreIdAndCode(store.getId(), code)
                    .orElseGet(() -> {
                        counters.createdPromotions++;
                        return new StorePromotion(
                                id("store-promotion:" + store.getSlug() + ":" + code),
                                store.getId(),
                                code,
                                promotionIndex == 0 ? StorePromotionType.PERCENTAGE : StorePromotionType.FIXED,
                                promotionIndex == 0 ? BigDecimal.TEN : new BigDecimal("500.00"),
                                true,
                                Instant.now().plusSeconds(60L * 60L * 24L * 90L),
                                500L
                        );
                    });
            promotion.setActive(true);
            storePromotionRepository.save(promotion);
        }
    }

    private List<StoreShippingZone> upsertShippingZones(SeedCounters counters, Store store) {
        List<StoreShippingZoneSpec> specs = List.of(
                new StoreShippingZoneSpec(ShippingZoneType.EXACT, "1000", null, null, "0.00"),
                new StoreShippingZoneSpec(ShippingZoneType.RANGE, null, 1001, 1499, "1200.00"),
                new StoreShippingZoneSpec(ShippingZoneType.RANGE, null, 1500, 1999, "1800.00")
        );
        List<StoreShippingZone> zones = new ArrayList<>();
        for (StoreShippingZoneSpec spec : specs) {
            StoreShippingZone zone = spec.type() == ShippingZoneType.EXACT
                    ? storeShippingZoneRepository.findByStoreIdAndTypeAndPostalCode(store.getId(), spec.type(), spec.postalCode()).orElse(null)
                    : storeShippingZoneRepository.findByStoreIdAndTypeAndRangeStartAndRangeEnd(store.getId(), spec.type(), spec.rangeStart(), spec.rangeEnd()).orElse(null);
            if (zone == null) {
                counters.createdShippingZones++;
                zone = new StoreShippingZone(
                        id("shipping:" + store.getSlug() + ":" + spec.type() + ":" + spec.postalCode() + ":" + spec.rangeStart()),
                        store.getId(),
                        spec.type(),
                        spec.postalCode(),
                        spec.rangeStart(),
                        spec.rangeEnd(),
                        new BigDecimal(spec.cost()),
                        CURRENCY
                );
            }
            zones.add(storeShippingZoneRepository.save(zone));
        }
        return zones;
    }

    private void upsertStoreOrders(SeedCounters counters, Store store, List<Product> products, List<StoreShippingZone> zones, String scope, int count) {
        if (products.isEmpty()) {
            return;
        }
        for (int i = 0; i < count; i++) {
            UUID orderId = id("order:" + scope + ":" + store.getSlug() + ":" + i);
            if (storeOrderRepository.existsById(orderId)) {
                continue;
            }
            Product product = products.get(i % products.size());
            int qty = (i % 3) + 1;
            BigDecimal unit = cents(product.getPriceCents());
            BigDecimal subtotal = unit.multiply(BigDecimal.valueOf(qty));
            StoreShippingZone zone = zones.isEmpty() ? null : zones.get(i % zones.size());
            BigDecimal shipping = zone == null ? BigDecimal.ZERO : zone.getCostAmount();
            BigDecimal total = subtotal.add(shipping);
            StoreOrderItem item = new StoreOrderItem(
                    id("order-item:" + orderId + ":" + product.getSku()),
                    orderId,
                    product.getId(),
                    qty,
                    unit,
                    subtotal,
                    CURRENCY,
                    "{\"name\":\"" + product.getName() + "\",\"sku\":\"" + product.getSku() + "\"}"
            );
            StoreOrder order = StoreOrder.create(
                    orderId,
                    store.getId(),
                    CURRENCY,
                    subtotal,
                    total,
                    shipping,
                    shipping.compareTo(BigDecimal.ZERO) > 0 ? CURRENCY : "",
                    zone == null ? null : zone.getId(),
                    zone == null ? null : (zone.getPostalCode() == null ? String.valueOf(zone.getRangeStart()) : zone.getPostalCode()),
                    total,
                    BigDecimal.ZERO,
                    null,
                    null,
                    "cliente" + (i + 1) + "@demo.barmi",
                    List.of(item)
            );
            order.markPaid();
            storeOrderRepository.save(order);
            storeOrderItemRepository.save(item);
            counters.createdOrders++;
            upsertFulfillment(counters, order, i);
        }
    }

    private void upsertFulfillment(SeedCounters counters, StoreOrder order, int index) {
        if (storeFulfillmentRepository.findByStoreOrderId(order.getId()).isPresent()) {
            return;
        }
        FulfillmentStatus status = switch (index % 3) {
            case 0 -> FulfillmentStatus.PENDING;
            case 1 -> FulfillmentStatus.DISPATCHED;
            default -> FulfillmentStatus.DELIVERED;
        };
        storeFulfillmentRepository.save(new StoreFulfillment(
                id("fulfillment:" + order.getId()),
                order.getId(),
                order.getStoreId(),
                "DELIVERY",
                status
        ));
        counters.createdFulfillments++;
    }

    private void upsertEcosystemPromotions(SeedCounters counters, Ecosystem ecosystem, List<String> codes) {
        for (int i = 0; i < codes.size(); i++) {
            final int promotionIndex = i;
            String code = codes.get(i);
            EcosystemPromotion promotion = ecosystemPromotionRepository.findByEcosystemIdAndCode(ecosystem.getId(), code)
                    .orElseGet(() -> {
                        counters.createdPromotions++;
                        return new EcosystemPromotion(
                                id("ecosystem-promotion:" + ecosystem.getSlug() + ":" + code),
                                ecosystem.getId(),
                                code,
                                promotionIndex == 0 ? EcosystemPromotionType.PERCENTAGE : EcosystemPromotionType.FIXED,
                                promotionIndex == 0 ? BigDecimal.TEN : new BigDecimal("750.00"),
                                true,
                                Instant.now().plusSeconds(60L * 60L * 24L * 90L),
                                1000L
                        );
                    });
            promotion.setActive(true);
            ecosystemPromotionRepository.save(promotion);
        }
    }

    private List<EcosystemExternalProduct> upsertEcosystemExternalProducts(SeedCounters counters, Ecosystem ecosystem, List<EcosystemStoreSpec> stores) {
        List<EcosystemExternalProduct> products = new ArrayList<>();
        int index = 0;
        for (EcosystemStoreSpec store : stores) {
            for (String suffix : List.of("favorito", "combo", "edicion demo")) {
                final int productIndex = index;
                String name = store.name() + " " + suffix;
                EcosystemExternalProduct product = ecosystemExternalProductRepository.findByEcosystem_IdAndNameIgnoreCase(ecosystem.getId(), name)
                        .orElseGet(() -> {
                            counters.createdProducts++;
                            return new EcosystemExternalProduct(
                                    id("ecosystem-product:" + ecosystem.getSlug() + ":" + name),
                                    ecosystem,
                                    name,
                                    new BigDecimal("3200.00").add(BigDecimal.valueOf(productIndex * 410L)),
                                    CURRENCY,
                                    true
                            );
                        });
                product.updateName(name);
                product.setActive(true);
                product.setDeliverySupported(true);
                products.add(ecosystemExternalProductRepository.save(product));
                index++;
            }
        }
        return products;
    }

    private void upsertEcosystemOrders(SeedCounters counters, Ecosystem ecosystem, List<EcosystemExternalProduct> products, int count) {
        if (products.isEmpty()) {
            return;
        }
        for (int i = 0; i < count; i++) {
            UUID orderId = id("ecosystem-order:" + ecosystem.getSlug() + ":" + i);
            if (ecosystemOrderRepository.existsById(orderId)) {
                continue;
            }
            EcosystemExternalProduct product = products.get(i % products.size());
            int qty = (i % 2) + 1;
            BigDecimal lineTotal = product.getPriceAmount().multiply(BigDecimal.valueOf(qty));
            EcosystemOrderItem item = new EcosystemOrderItem(
                    id("ecosystem-order-item:" + orderId + ":" + product.getId()),
                    product.getId(),
                    qty,
                    product.getPriceAmount(),
                    lineTotal,
                    "{\"name\":\"" + product.getName() + "\",\"source\":\"demo\"}"
            );
            EcosystemOrder order = EcosystemOrder.create(
                    orderId,
                    ecosystem,
                    CURRENCY,
                    lineTotal,
                    BigDecimal.ZERO,
                    "",
                    null,
                    null,
                    lineTotal,
                    List.of(item)
            );
            order.markPaid();
            ecosystemOrderRepository.save(order);
            counters.createdOrders++;
            upsertEcosystemFulfillment(counters, order, i);
        }
    }

    private void upsertEcosystemFulfillment(SeedCounters counters, EcosystemOrder order, int index) {
        if (ecosystemFulfillmentRepository.findByEcosystemOrderId(order.getId()).isPresent()) {
            return;
        }
        FulfillmentStatus status = switch (index % 3) {
            case 0 -> FulfillmentStatus.PENDING;
            case 1 -> FulfillmentStatus.DISPATCHED;
            default -> FulfillmentStatus.DELIVERED;
        };
        ecosystemFulfillmentRepository.save(new EcosystemFulfillment(
                id("ecosystem-fulfillment:" + order.getId()),
                order.getId(),
                order.getEcosystem().getId(),
                "DELIVERY",
                status
        ));
        counters.createdFulfillments++;
    }

    private BigDecimal decimalOrNull(String value) {
        return value == null ? null : new BigDecimal(value);
    }

    private BigDecimal cents(long cents) {
        return BigDecimal.valueOf(cents, 2);
    }

    private UUID id(String key) {
        return UUID.nameUUIDFromBytes(("barmi-demo-seed:" + key).getBytes(StandardCharsets.UTF_8));
    }

    public record SeedScenarioDto(String key, String name, String description) {}

    public record SeedResult(
            boolean success,
            int createdStores,
            int createdProducts,
            int createdOrders,
            int createdPromotions,
            int createdEcosystems,
            int createdCategories,
            int createdShippingZones,
            int createdFulfillments
    ) {
        SeedResult plus(SeedResult other) {
            return new SeedResult(
                    success && other.success,
                    createdStores + other.createdStores,
                    createdProducts + other.createdProducts,
                    createdOrders + other.createdOrders,
                    createdPromotions + other.createdPromotions,
                    createdEcosystems + other.createdEcosystems,
                    createdCategories + other.createdCategories,
                    createdShippingZones + other.createdShippingZones,
                    createdFulfillments + other.createdFulfillments
            );
        }

        public Map<String, Object> toResponse() {
            return Map.of(
                    "success", success,
                    "createdStores", createdStores,
                    "createdProducts", createdProducts,
                    "createdOrders", createdOrders,
                    "createdPromotions", createdPromotions,
                    "createdEcosystems", createdEcosystems,
                    "createdCategories", createdCategories,
                    "createdShippingZones", createdShippingZones,
                    "createdFulfillments", createdFulfillments
            );
        }
    }

    private static class SeedCounters {
        int createdStores;
        int createdProducts;
        int createdOrders;
        int createdPromotions;
        int createdEcosystems;
        int createdCategories;
        int createdShippingZones;
        int createdFulfillments;

        SeedResult toResult() {
            return new SeedResult(
                    true,
                    createdStores,
                    createdProducts,
                    createdOrders,
                    createdPromotions,
                    createdEcosystems,
                    createdCategories,
                    createdShippingZones,
                    createdFulfillments
            );
        }
    }

    private record EcosystemStoreSpec(
            String slug,
            String name,
            String categoryKey,
            String description,
            String latitude,
            String longitude
    ) {
        EcosystemStoreSpec(String slug, String name, String categoryKey, String description) {
            this(slug, name, categoryKey, description, null, null);
        }
    }

    private record StoreShippingZoneSpec(
            ShippingZoneType type,
            String postalCode,
            Integer rangeStart,
            Integer rangeEnd,
            String cost
    ) {}
}
