package com.barmi.api;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:actuator-hardening;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.flyway.locations=classpath:db/migration-h2",
        "spring.jpa.hibernate.ddl-auto=none",
        "app.security.jwtSecret=real-jwt-secret-32-bytes-minimum-value",
        "app.mercadoPago.webhookSecret=real-webhook-secret",
        "app.tenant.baseDomain=barmi.example.org",
        "app.security.allowedOrigins=https://app.barmi.example",
        "app.security.refreshCookie.secure=true",
        "app.security.allowDevIdentityHeader=false"
})
@AutoConfigureMockMvc
@ActiveProfiles("prod")
class ActuatorSecurityHardeningTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void healthIsPublicAndDoesNotExposeInternalComponentsInProd() throws Exception {
        MvcResult result = mockMvc.perform(get("/actuator/health"))
                .andExpect(jsonPath("$.status").exists())
                .andExpect(jsonPath("$.components").doesNotExist())
                .andExpect(jsonPath("$.details").doesNotExist())
                .andReturn();

        assertThat(result.getResponse().getStatus()).isNotIn(401, 403);
    }

    @Test
    void livenessAndReadinessRemainPublicForInfrastructure() throws Exception {
        mockMvc.perform(get("/actuator/health/liveness"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").exists())
                .andExpect(jsonPath("$.components").doesNotExist());

        mockMvc.perform(get("/actuator/health/readiness"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").exists())
                .andExpect(jsonPath("$.components").doesNotExist());
    }

    @Test
    void metricsAndInfoAreNotPublicInProd() throws Exception {
        mockMvc.perform(get("/actuator/metrics"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/actuator/prometheus"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/actuator/info"))
                .andExpect(status().isUnauthorized());
    }
}
