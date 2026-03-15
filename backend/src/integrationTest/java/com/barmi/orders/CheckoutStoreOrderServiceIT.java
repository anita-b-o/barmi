package com.barmi.orders;

import com.barmi.app.orders.CheckoutStoreOrderService;
import com.barmi.app.orders.CheckoutStoreOrderService.CheckoutItem;
import com.barmi.app.tenant.TenantContext;
import com.barmi.domain.catalog.Product;
import com.barmi.domain.orders.StoreOrder;
import com.barmi.domain.orders.StoreOrderItem;
import com.barmi.domain.store.Store;
import com.barmi.infra.repo.OutboxEventRepository;
import com.barmi.infra.repo.ProductRepository;
import com.barmi.infra.repo.StoreOrderItemRepository;
import com.barmi.infra.repo.StoreOrderRepository;
import com.barmi.infra.repo.StoreRepository;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.TestConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;


import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase.Replace.NONE;

@Testcontainers
@SpringBootTest(properties = {
        "jwt.secret=this_is_a_super_long_test_secret_key_that_is_at_least_32_bytes_long",
        "app.money.defaultCurrency=ARS"
})
@TestConstructor(autowireMode = TestConstructor.AutowireMode.ALL)
@ActiveProfiles("integrationtest")
@AutoConfigureTestDatabase(replace = NONE)
class CheckoutStoreOrderServiceIT {

    @Container
    static PostgreSQLContainer<?> postgres =
            new PostgreSQLContainer<>("postgres:15.6")
                    .withDatabaseName("barmi_test")
                    .withUsername("test")
                    .withPassword("test");

    @DynamicPropertySource
    static void registerProps(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);

        registry.add("spring.flyway.url", postgres::getJdbcUrl);
        registry.add("spring.flyway.user", postgres::getUsername);
        registry.add("spring.flyway.password", postgres::getPassword);
    }

    private final CheckoutStoreOrderService checkoutService;
    private final StoreRepository storeRepository;
    private final ProductRepository productRepository;
    private final StoreOrderRepository storeOrderRepository;
    private final StoreOrderItemRepository storeOrderItemRepository;
    private final OutboxEventRepository outboxEventRepository;

@Autowired
    CheckoutStoreOrderServiceIT(
            CheckoutStoreOrderService checkoutService,
            StoreRepository storeRepository,
            ProductRepository productRepository,
            StoreOrderRepository storeOrderRepository,
            StoreOrderItemRepository storeOrderItemRepository,
            OutboxEventRepository outboxEventRepository
    ) {
        this.checkoutService = checkoutService;
        this.storeRepository = storeRepository;
        this.productRepository = productRepository;
        this.storeOrderRepository = storeOrderRepository;
        this.storeOrderItemRepository = storeOrderItemRepository;
        this.outboxEventRepository = outboxEventRepository;
    }

    @Test
    void checkoutCreatesOrderItemsAndOutbox() {
        Store store = storeRepository.save(new Store(UUID.randomUUID(), "cafe", "Cafe"));
        Product p1 = productRepository.save(new Product(UUID.randomUUID(), store.getId(), "SKU1", "Latte", 500));
        Product p2 = productRepository.save(new Product(UUID.randomUUID(), store.getId(), "SKU2", "Mocha", 700));

        TenantContext.setStoreSlug("cafe");
        try {
            StoreOrder order = checkoutService.checkout(List.of(
                    new CheckoutItem(p1.getId(), 2),
                    new CheckoutItem(p2.getId(), 1)
            ), null);

            assertThat(storeOrderRepository.findById(order.getId())).isPresent();
            assertThat(order.getCurrency()).isEqualTo("ARS");
            assertThat(order.getShippingCostAmount()).isEqualTo(BigDecimal.ZERO);

            List<StoreOrderItem> items = storeOrderItemRepository.findByOrderId(order.getId());
            assertThat(items).hasSize(2);
            assertThat(items.get(0).getItemSnapshotJson()).contains("name");
            assertThat(items.get(0).getItemSnapshotJson()).contains("unit_price_amount");
            assertThat(items.get(0).getItemSnapshotJson()).contains("currency");

            assertThat(outboxEventRepository.findByAggregateIdAndEventType(order.getId(), "STORE_ORDER_CREATED"))
                    .hasSize(1);
        } finally {
            TenantContext.clear();
        }
    }
}
