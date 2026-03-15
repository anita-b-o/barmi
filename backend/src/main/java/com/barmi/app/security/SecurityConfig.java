package com.barmi.app.security;

import com.barmi.app.tenant.StoreResolverFilter;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

/**
 * MVP: JWT parsing is intentionally left minimal; endpoints are open except /api/admin/**
 * Extend with real auth + roles.
 */
@Configuration
public class SecurityConfig {

    @Bean
    SecurityFilterChain filterChain(
            HttpSecurity http,
            StoreResolverFilter storeResolverFilter,
            JwtAuthenticationFilter jwtAuthenticationFilter,
            ApiAuthenticationEntryPoint apiAuthenticationEntryPoint,
            ApiAccessDeniedHandler apiAccessDeniedHandler
    ) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/actuator/health").permitAll()
                .requestMatchers("/api/webhooks/**").permitAll()
                .requestMatchers("/api/public/**").permitAll()
                .requestMatchers("/api/auth/login", "/api/auth/refresh").permitAll()
                .requestMatchers("/api/auth/me").authenticated()
                .requestMatchers("/api/store/members/**").authenticated()
                .requestMatchers("/api/store/shipping/zones/**").authenticated()
                .requestMatchers("/api/store/orders/*/fulfillment").authenticated()
                .requestMatchers("/api/store/fulfillments/**").authenticated()
                .requestMatchers("/api/ecosystem/admin/**").authenticated()
                .requestMatchers("/api/ecosystem/orders/*/fulfillment").authenticated()
                .requestMatchers("/api/ecosystem/fulfillments/**").authenticated()
                .requestMatchers("/api/store/checkout").permitAll()
                .requestMatchers("/api/ecosystem/checkout").permitAll()
                .requestMatchers("/api/store/shipping/quote").permitAll()
                .requestMatchers("/api/store/payments/initiate").permitAll()
                .requestMatchers("/api/ecosystem/payments/initiate").permitAll()
                .requestMatchers("/api/store/orders/**").permitAll()
                .requestMatchers("/api/ecosystem/orders/**").permitAll()
                .requestMatchers("/api/admin/**").authenticated()
                .anyRequest().permitAll()
            )
            .httpBasic(Customizer.withDefaults())
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint(apiAuthenticationEntryPoint)
                .accessDeniedHandler(apiAccessDeniedHandler)
            );

        // Resolve store slug early for all requests
        http.addFilterBefore(storeResolverFilter, UsernamePasswordAuthenticationFilter.class);
        http.addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    ApiAuthenticationEntryPoint apiAuthenticationEntryPoint(ObjectMapper objectMapper) {
        return new ApiAuthenticationEntryPoint(objectMapper);
    }

    @Bean
    ApiAccessDeniedHandler apiAccessDeniedHandler(ObjectMapper objectMapper) {
        return new ApiAccessDeniedHandler(objectMapper);
    }

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
