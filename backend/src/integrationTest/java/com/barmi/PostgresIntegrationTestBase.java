package com.barmi;

import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase.Replace.NONE;

@Testcontainers
@SpringBootTest(properties = {
        "jwt.secret=this_is_a_super_long_test_secret_key_that_is_at_least_32_bytes_long"
})
@ActiveProfiles("integrationtest")
@AutoConfigureTestDatabase(replace = NONE)
public abstract class PostgresIntegrationTestBase {
    private static final String TRUNCATE_ALL_TABLES_SQL = """
            TRUNCATE TABLE
              refresh_tokens,
              payment_intents,
              payments,
              ecosystem_fulfillments,
              store_fulfillments,
              ecosystem_order_items,
              ecosystem_orders,
              store_order_items,
              store_orders,
              ecosystem_members,
              store_members,
              ecosystem_shipping_zones,
              store_shipping_zones,
              beta_feedback_entries,
              beta_product_events,
              saas_subscriptions,
              ecosystem_external_products,
              ecosystem_promotions,
              store_promotions,
              store_categories,
              external_products,
              products,
              stores,
              ecosystems,
              users,
              outbox_events,
              processed_events
            RESTART IDENTITY CASCADE
            """;

    static PostgreSQLContainer<?> postgres =
            new PostgreSQLContainer<>("postgres:15.6")
                    .withDatabaseName("barmi_test")
                    .withUsername("test")
                    .withPassword("test");

    static {
        postgres.start();
    }

    @DynamicPropertySource
    static void registerProps(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);

        registry.add("spring.flyway.url", postgres::getJdbcUrl);
        registry.add("spring.flyway.user", postgres::getUsername);
        registry.add("spring.flyway.password", postgres::getPassword);
    }

    protected void truncateAllTables(JdbcTemplate jdbcTemplate) {
        jdbcTemplate.execute(TRUNCATE_ALL_TABLES_SQL);
    }
}
