package com.barmi.api;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
        "spring.profiles.active=qa",
        "spring.datasource.url=jdbc:h2:mem:barmi-prod-profile;DB_CLOSE_DELAY=-1;MODE=PostgreSQL",
        "spring.datasource.driverClassName=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=none",
        "spring.flyway.enabled=true",
        "spring.flyway.locations=classpath:db/migration-h2",
        "app.security.jwtSecret=test-secret-please-change-32-bytes-minimum",
        "app.rateLimit.enabled=false",
        "app.mercadoPago.stubEnabled=true",
        "app.mercadoPago.replayGuard.enabled=false",
        "app.notifications.email.mode=logging"
})
@ActiveProfiles("qa")
@AutoConfigureMockMvc
class AdminDevControllerProfileTest {

    private final MockMvc mockMvc;

    @Autowired
    AdminDevControllerProfileTest(MockMvc mockMvc) {
        this.mockMvc = mockMvc;
    }

    @Test
    void devSeedEndpointIsDisabledOutsideLocalDevProfiles() throws Exception {
        mockMvc.perform(get("/api/admin/dev/seeds"))
                .andExpect(status().isNotFound());
    }
}
