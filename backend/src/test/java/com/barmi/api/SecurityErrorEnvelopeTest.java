package com.barmi.api;

import com.barmi.app.security.ApiAccessDeniedHandler;
import com.barmi.app.security.ApiAuthenticationEntryPoint;
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
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
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
                .andExpect(jsonPath("$.error.code").value("unauthorized"))
                .andExpect(jsonPath("$.error.message").value("Unauthorized"))
                .andExpect(jsonPath("$.error.status").value(401));
    }

    @WithMockUser(roles = "USER")
    @Test
    void returnsForbiddenEnvelope() throws Exception {
        mockMvc.perform(
                post("/api/admin/dev/store")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"slug\":\"demo\",\"name\":\"Demo\"}")
        )
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("forbidden"))
                .andExpect(jsonPath("$.error.message").value("Forbidden"))
                .andExpect(jsonPath("$.error.status").value(403));
    }

    @TestConfiguration
    static class TestSecurityConfig {

        @Bean
        @Order(0)
        SecurityFilterChain adminChain(
                HttpSecurity http,
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

            return http.build();
        }
    }
}
