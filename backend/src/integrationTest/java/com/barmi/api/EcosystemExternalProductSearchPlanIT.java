package com.barmi.api;

import com.barmi.PostgresIntegrationTestBase;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.jdbc.core.BatchPreparedStatementSetter;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@AutoConfigureMockMvc
class EcosystemExternalProductSearchPlanIT extends PostgresIntegrationTestBase {

    private static final int TARGET_PRODUCT_COUNT = 10_000;
    private static final int OTHER_PRODUCT_COUNT = 1_000;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private MockMvc mockMvc;

    private UUID targetEcosystemId;
    private UUID otherEcosystemId;

    @BeforeEach
    void setup() {
        truncateAllTables(jdbcTemplate);

        targetEcosystemId = UUID.randomUUID();
        otherEcosystemId = UUID.randomUUID();

        jdbcTemplate.update(
                "insert into ecosystems (id, name, slug, is_active, created_at) values (?, ?, ?, true, now())",
                targetEcosystemId,
                "Search Baseline Ecosystem",
                "search-baseline"
        );
        jdbcTemplate.update(
                "insert into ecosystems (id, name, slug, is_active, created_at) values (?, ?, ?, true, now())",
                otherEcosystemId,
                "Other Search Baseline Ecosystem",
                "other-search-baseline"
        );

        insertProducts(targetEcosystemId, "baseline", TARGET_PRODUCT_COUNT);
        insertProducts(otherEcosystemId, "other", OTHER_PRODUCT_COUNT);
        jdbcTemplate.execute("ANALYZE ecosystem_external_products");
    }

    @Test
    void migrationAddsSearchIndexesAndPgTrgmExtension() {
        Integer extensionCount = jdbcTemplate.queryForObject(
                "select count(*) from pg_extension where extname in ('pg_trgm', 'btree_gin')",
                Integer.class
        );

        List<String> indexes = jdbcTemplate.queryForList(
                """
                select indexname
                from pg_indexes
                where schemaname = current_schema()
                  and tablename = 'ecosystem_external_products'
                order by indexname
                """,
                String.class
        );

        assertThat(extensionCount).isEqualTo(2);
        assertThat(indexes).contains(
                "idx_ecosystem_external_products_ecosystem_id",
                "idx_ecosystem_external_products_ecosystem_id_is_active",
                "idx_ecosystem_external_products_ecosystem_id_name",
                "idx_ecosystem_external_products_public_created",
                "idx_ecosystem_external_products_public_delivery_created",
                "idx_ecosystem_external_products_public_name_created",
                "idx_ecosystem_external_products_public_price_created",
                "idx_ecosystem_external_products_name_trgm"
        );
    }

    @Test
    void publicProductsEndpointKeepsFilteringSortingAndPaginationContract() throws Exception {
        mockMvc.perform(get("/api/public/ecosystems/search-baseline/products")
                        .param("q", "needle")
                        .param("deliverySupported", "true")
                        .param("activeOnly", "true")
                        .param("sort", "price,asc")
                        .param("page", "0")
                        .param("size", "3"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(3))
                .andExpect(jsonPath("$.content[0].name").value("Needle Match 00000"))
                .andExpect(jsonPath("$.content[0].deliverySupported").value(true))
                .andExpect(jsonPath("$.content[0].priceAmount").value(10.00))
                .andExpect(jsonPath("$.content[1].name").value("Needle Match 00200"))
                .andExpect(jsonPath("$.content[2].name").value("Needle Match 00400"))
                .andExpect(jsonPath("$.page").value(0))
                .andExpect(jsonPath("$.size").value(3))
                .andExpect(jsonPath("$.totalElements").value(50))
                .andExpect(jsonPath("$.totalPages").value(17));
    }

    @Test
    void explainBaselineUsesExpectedIndexesForPublicDiscoveryShapes() {
        assertPlanUsesIndex(
                "default createdAt query",
                """
                select id
                from ecosystem_external_products
                where ecosystem_id = ?
                  and is_active = true
                order by created_at desc
                limit 24 offset 0
                """,
                "idx_ecosystem_external_products_public_created",
                targetEcosystemId
        );

        assertPlanUsesIndex(
                "deliverySupported filter",
                """
                select id
                from ecosystem_external_products
                where ecosystem_id = ?
                  and is_active = true
                  and delivery_supported = true
                order by created_at desc
                limit 24 offset 0
                """,
                "idx_ecosystem_external_products_public_delivery_created",
                targetEcosystemId
        );

        assertPlanUsesIndex(
                "name sort",
                """
                select id
                from ecosystem_external_products
                where ecosystem_id = ?
                  and is_active = true
                order by name asc, created_at desc
                limit 24 offset 0
                """,
                "idx_ecosystem_external_products_public_name_created",
                targetEcosystemId
        );

        assertPlanUsesIndex(
                "price sort",
                """
                select id
                from ecosystem_external_products
                where ecosystem_id = ?
                  and is_active = true
                order by price_amount asc, created_at desc
                limit 24 offset 0
                """,
                "idx_ecosystem_external_products_public_price_created",
                targetEcosystemId
        );

        String substringPlan = explain(
                """
                select id
                from ecosystem_external_products
                where ecosystem_id = ?
                  and is_active = true
                  and lower(name) like ?
                order by created_at desc
                limit 24 offset 0
                """,
                targetEcosystemId,
                "%needle%"
        );
        assertThat(substringPlan)
                .as("substring query baseline should keep the current lower(name) LIKE shape")
                .contains("lower(name)");

        assertThat(substringPlan)
                .as("substring query baseline should remain tenant-scoped")
                .contains("ecosystem_id");

        String relevancePlan = explain(
                """
                select id
                from ecosystem_external_products
                where ecosystem_id = ?
                  and is_active = true
                  and lower(name) like ?
                order by
                  case when lower(name) = ? then 0 else 1 end,
                  case when lower(name) like ? then 0 else 1 end,
                  case when delivery_supported = true then 0 else 1 end,
                  case when is_active = true then 0 else 1 end,
                  created_at desc,
                  id asc
                limit 24 offset 0
                """,
                targetEcosystemId,
                "%needle%",
                "needle",
                "needle%"
        );
        assertThat(relevancePlan)
                .as("relevance query baseline should keep the current lower(name) LIKE shape")
                .contains("lower(name)");
        assertThat(relevancePlan)
                .as("relevance query baseline should remain tenant-scoped")
                .contains("ecosystem_id");
    }

    private void insertProducts(UUID ecosystemId, String prefix, int count) {
        Instant base = Instant.parse("2026-01-01T00:00:00Z");
        jdbcTemplate.batchUpdate(
                """
                insert into ecosystem_external_products
                  (id, ecosystem_id, name, price_amount, currency, is_active, delivery_supported, created_at)
                values (?, ?, ?, ?, 'ARS', ?, ?, ?)
                """,
                new BatchPreparedStatementSetter() {
                    @Override
                    public void setValues(PreparedStatement ps, int i) throws SQLException {
                        ps.setObject(1, UUID.randomUUID());
                        ps.setObject(2, ecosystemId);
                        ps.setString(3, productName(prefix, i));
                        ps.setBigDecimal(4, productPrice(i));
                        ps.setBoolean(5, i % 20 != 19);
                        ps.setBoolean(6, i % 2 == 0);
                        ps.setTimestamp(7, Timestamp.from(base.plusSeconds(i)));
                    }

                    @Override
                    public int getBatchSize() {
                        return count;
                    }
                }
        );
    }

    private String productName(String prefix, int index) {
        if ("baseline".equals(prefix) && index % 200 == 0) {
            return "Needle Match " + String.format("%05d", index);
        }
        return "Catalog " + prefix + " Product " + String.format("%05d", index);
    }

    private BigDecimal productPrice(int index) {
        if (index % 200 == 0) {
            return BigDecimal.valueOf(10L + (index / 200));
        }
        return BigDecimal.valueOf(100L + (index % 500));
    }

    private void assertPlanUsesIndex(String label, String sql, String indexName, Object... params) {
        String plan = explain(sql, params);
        assertThat(plan)
                .as(label + " should use " + indexName + System.lineSeparator() + plan)
                .contains(indexName);
    }

    private String explain(String sql, Object... params) {
        return jdbcTemplate.queryForObject(
                "explain (analyze, buffers, format json) " + sql,
                String.class,
                params
        );
    }
}
