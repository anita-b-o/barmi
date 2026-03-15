package com.barmi.shipping;

import com.barmi.domain.shipping.ShippingZoneType;
import com.barmi.domain.shipping.StoreShippingZone;
import com.barmi.domain.store.Store;
import com.barmi.infra.repo.StoreRepository;
import com.barmi.infra.repo.StoreShippingZoneRepository;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.TestConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import com.barmi.testsupport.ApiTestClient;

import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;


import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase.Replace.NONE;

@Testcontainers
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "jwt.secret=this_is_a_super_long_test_secret_key_that_is_at_least_32_bytes_long",
        "app.money.defaultCurrency=ARS"
})
@org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
@TestConstructor(autowireMode = TestConstructor.AutowireMode.ALL)
@ActiveProfiles("integrationtest")
@AutoConfigureTestDatabase(replace = NONE)
class StoreShippingQuoteIT {

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

    private final StoreRepository storeRepository;
    private final StoreShippingZoneRepository storeShippingZoneRepository;
    private final ApiTestClient api;

    @Autowired
    StoreShippingQuoteIT(
            StoreRepository storeRepository,
            StoreShippingZoneRepository storeShippingZoneRepository,
            MockMvc mockMvc
    ) {
        this.storeRepository = storeRepository;
        this.storeShippingZoneRepository = storeShippingZoneRepository;
        this.api = new ApiTestClient(mockMvc);
    }

    @Test
    void quotePrefersExactOverRangeAndHandlesNoCoverage() throws Exception {
        Store store = storeRepository.save(new Store(UUID.randomUUID(), "ship", "Ship"));

        StoreShippingZone rangeZone = new StoreShippingZone(
                UUID.randomUUID(),
                store.getId(),
                ShippingZoneType.RANGE,
                null,
                1000,
                1999,
                new BigDecimal("10.00"),
                "ARS"
        );
        storeShippingZoneRepository.save(rangeZone);

        StoreShippingZone exactZone = new StoreShippingZone(
                UUID.randomUUID(),
                store.getId(),
                ShippingZoneType.EXACT,
                "1234",
                null,
                null,
                new BigDecimal("5.00"),
                "ARS"
        );
        storeShippingZoneRepository.save(exactZone);

        HttpHeaders headers = api.storeHostHeaders("ship");

        ApiTestClient.ApiTestResponse exactResp = api.get(
                "/api/store/shipping/quote?postalCode=1234",
                headers
        );
        assertThat(exactResp.status()).isEqualTo(200);
        assertThat(exactResp.body().get("zoneId").toString()).isEqualTo(exactZone.getId().toString());
        assertThat(new BigDecimal(exactResp.body().get("costAmount").toString()))
                .isEqualByComparingTo(new BigDecimal("5.00"));

        ApiTestClient.ApiTestResponse rangeResp = api.get(
                "/api/store/shipping/quote?postalCode=1500",
                headers
        );
        assertThat(rangeResp.status()).isEqualTo(200);
        assertThat(rangeResp.body().get("zoneId").toString()).isEqualTo(rangeZone.getId().toString());
        assertThat(new BigDecimal(rangeResp.body().get("costAmount").toString()))
                .isEqualByComparingTo(new BigDecimal("10.00"));

        ApiTestClient.ApiTestResponse invalidResp = api.get(
                "/api/store/shipping/quote?postalCode=ABCD",
                headers
        );
        assertThat(invalidResp.status()).isEqualTo(404);
        Map<String, Object> error = (Map<String, Object>) invalidResp.body().get("error");
        assertThat(error.get("code")).isEqualTo("shipping_not_available");
    }
}
