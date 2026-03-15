package com.barmi.api;

import com.barmi.domain.ecosystem.Ecosystem;
import com.barmi.domain.ecosystem.EcosystemExternalProduct;
import com.barmi.infra.repo.EcosystemExternalProductRepository;
import com.barmi.infra.repo.EcosystemRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.lang.reflect.Field;
import java.math.BigDecimal;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class EcosystemPublicDiscoveryTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private EcosystemRepository ecosystemRepository;

    @Autowired
    private EcosystemExternalProductRepository ecosystemExternalProductRepository;

    private Ecosystem activeEcosystem;
    private Ecosystem inactiveEcosystem;

    @BeforeEach
    void setup() throws Exception {
        ecosystemExternalProductRepository.deleteAll();
        ecosystemRepository.deleteAll();

        activeEcosystem = new Ecosystem(
                UUID.randomUUID(),
                "Demo Ecosystem",
                "demo-ecosystem"
        );
        ecosystemRepository.save(activeEcosystem);

        inactiveEcosystem = new Ecosystem(
                UUID.randomUUID(),
                "Inactive Ecosystem",
                "inactive-ecosystem"
        );
        setActive(inactiveEcosystem, false);
        ecosystemRepository.save(inactiveEcosystem);

        EcosystemExternalProduct apple = new EcosystemExternalProduct(
                UUID.randomUUID(),
                activeEcosystem,
                "External Apple",
                new BigDecimal("150.00"),
                "ARS",
                true
        );

        EcosystemExternalProduct banana = new EcosystemExternalProduct(
                UUID.randomUUID(),
                activeEcosystem,
                "External Banana",
                new BigDecimal("120.00"),
                "ARS",
                true
        );
        banana.setActive(false);

        ecosystemExternalProductRepository.save(apple);
        ecosystemExternalProductRepository.save(banana);
    }

    @Test
    void getsEcosystemBySlug() throws Exception {
        mockMvc.perform(get("/api/public/ecosystems/demo-ecosystem"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(activeEcosystem.getId().toString()))
                .andExpect(jsonPath("$.slug").value("demo-ecosystem"))
                .andExpect(jsonPath("$.name").value("Demo Ecosystem"));
    }

    @Test
    void returnsNotFoundForMissingEcosystem() throws Exception {
        mockMvc.perform(get("/api/public/ecosystems/unknown"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.code").value("ecosystem_not_found"));
    }

    @Test
    void returnsForbiddenForInactiveEcosystem() throws Exception {
        mockMvc.perform(get("/api/public/ecosystems/inactive-ecosystem"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("ecosystem_inactive"));
    }

    @Test
    void listsProductsBySlug() throws Exception {
        mockMvc.perform(get("/api/public/ecosystems/demo-ecosystem/products")
                .param("query", "Apple")
                .param("activeOnly", "true")
                .contentType(MediaType.APPLICATION_JSON)
        )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].name").value("External Apple"))
                .andExpect(jsonPath("$[0].currency").value("ARS"));
    }

    @Test
    void returnsForbiddenForInactiveEcosystemProducts() throws Exception {
        mockMvc.perform(get("/api/public/ecosystems/inactive-ecosystem/products"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("ecosystem_inactive"));
    }

    private void setActive(Ecosystem ecosystem, boolean active) throws Exception {
        Field field = Ecosystem.class.getDeclaredField("active");
        field.setAccessible(true);
        field.set(ecosystem, active);
    }
}
