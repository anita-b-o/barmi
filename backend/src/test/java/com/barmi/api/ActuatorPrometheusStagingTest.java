package com.barmi.api;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.actuate.observability.AutoConfigureObservability;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:actuator-prometheus-staging;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.flyway.locations=classpath:db/migration-h2",
        "spring.jpa.hibernate.ddl-auto=none",
        "app.security.jwtSecret=real-jwt-secret-32-bytes-minimum-value",
        "app.mercadoPago.webhookSecret=real-webhook-secret",
        "app.tenant.baseDomain=staging.barmi.local",
        "app.security.allowedOrigins=https://app.staging.barmi.local",
        "app.security.refreshCookie.secure=true",
        "app.security.allowDevIdentityHeader=false",
        "app.observability.prometheus.scrapeEnabled=true",
        "management.endpoints.web.exposure.include=health,info,metrics,prometheus"
})
@AutoConfigureMockMvc
@AutoConfigureObservability
@ActiveProfiles("staging")
class ActuatorPrometheusStagingTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void prometheusEndpointIsAvailableForInternalStagingScrape() throws Exception {
        mockMvc.perform(get("/actuator/prometheus"))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("jvm_info")));
    }
}
