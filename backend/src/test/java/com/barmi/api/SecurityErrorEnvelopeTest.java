package com.barmi.api;

import com.barmi.app.security.ApiAccessDeniedHandler;
import com.barmi.app.security.ApiAuthenticationEntryPoint;
import com.barmi.app.config.RequestCorrelationFilter;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.core.annotation.Order;
import org.springframework.http.MediaType;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(SecurityErrorEnvelopeTest.TestSecurityConfig.class)
class SecurityErrorEnvelopeTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void returnsUnauthorizedEnvelope() throws Exception {
        mockMvc.perform(
                post("/api/admin/dev/store")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"slug\":\"demo\",\"name\":\"Demo\"}")
        )
                .andExpect(status().isUnauthorized())
                .andExpect(header().exists("X-Request-Id"))
                .andExpect(jsonPath("$.error.code").value("unauthorized"))
                .andExpect(jsonPath("$.error.message").value("Unauthorized"))
                .andExpect(jsonPath("$.error.status").value(401))
                .andExpect(jsonPath("$.error.requestId").isNotEmpty());
    }

    @WithMockUser(roles = "USER")
    @Test
    void returnsForbiddenEnvelope() throws Exception {
        mockMvc.perform(
                post("/api/admin/dev/store")
                        .header("X-Request-Id", "qa-request-id")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"slug\":\"demo\",\"name\":\"Demo\"}")
        )
                .andExpect(status().isForbidden())
                .andExpect(header().string("X-Request-Id", "qa-request-id"))
                .andExpect(jsonPath("$.error.code").value("forbidden"))
                .andExpect(jsonPath("$.error.message").value("Forbidden"))
                .andExpect(jsonPath("$.error.status").value(403))
                .andExpect(jsonPath("$.error.requestId").value("qa-request-id"));
    }

    @TestConfiguration
    static class TestSecurityConfig {

        @Bean
        @Order(0)
        SecurityFilterChain adminChain(
                HttpSecurity http,
                RequestCorrelationFilter requestCorrelationFilter,
                ApiAuthenticationEntryPoint apiAuthenticationEntryPoint,
                ApiAccessDeniedHandler apiAccessDeniedHandler
        ) throws Exception {
            http
                .securityMatcher("/api/admin/**")
                .csrf(csrf -> csrf.disable())
                .authorizeHttpRequests(auth -> auth
                    .anyRequest().hasRole("ADMIN")
                )
                .httpBasic(Customizer.withDefaults())
                .exceptionHandling(ex -> ex
                    .authenticationEntryPoint(apiAuthenticationEntryPoint)
                    .accessDeniedHandler(apiAccessDeniedHandler)
                );

            http.addFilterBefore(requestCorrelationFilter, UsernamePasswordAuthenticationFilter.class);

            return http.build();
        }
    }
}
