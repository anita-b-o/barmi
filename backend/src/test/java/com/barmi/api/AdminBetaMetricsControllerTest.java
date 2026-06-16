package com.barmi.api;

import com.barmi.app.beta.BetaLaunchToolkitService;
import com.barmi.app.beta.BetaMetricsQueryService;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AdminBetaMetricsControllerTest {

    private final BetaMetricsQueryService betaMetricsQueryService = mock(BetaMetricsQueryService.class);
    private final BetaLaunchToolkitService betaLaunchToolkitService = mock(BetaLaunchToolkitService.class);
    private final MockMvc mockMvc = MockMvcBuilders
            .standaloneSetup(new AdminBetaMetricsController(betaMetricsQueryService, betaLaunchToolkitService))
            .build();

    @Test
    void storesEndpointReturnsBetaLaunchToolkitStores() throws Exception {
        UUID storeId = UUID.randomUUID();
        when(betaLaunchToolkitService.stores()).thenReturn(List.of(new BetaLaunchToolkitService.BetaStoreDto(
                storeId,
                "demo-store",
                "Demo Store",
                100,
                true,
                BetaLaunchToolkitService.BetaStatus.READY,
                "MODERN",
                List.of("ABOUT", "CONTACT"),
                Instant.parse("2026-06-16T12:00:00Z")
        )));

        mockMvc.perform(get("/api/admin/beta/stores"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].storeId").value(storeId.toString()))
                .andExpect(jsonPath("$[0].storeSlug").value("demo-store"))
                .andExpect(jsonPath("$[0].storeName").value("Demo Store"))
                .andExpect(jsonPath("$[0].readinessScore").value(100))
                .andExpect(jsonPath("$[0].publishReady").value(true))
                .andExpect(jsonPath("$[0].betaStatus").value("READY"))
                .andExpect(jsonPath("$[0].appearancePreset").value("MODERN"))
                .andExpect(jsonPath("$[0].capabilitiesEnabled[0]").value("ABOUT"))
                .andExpect(jsonPath("$[0].createdAt").exists());
    }
}
