package com.barmi.app.security;

import com.barmi.app.config.RequestCorrelationFilter;
import com.barmi.app.ratelimit.RateLimitFilter;
import com.barmi.app.tenant.StoreResolverFilter;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import java.util.Arrays;
import java.util.List;

/**
 * MVP: JWT parsing is intentionally left minimal; endpoints are open except /api/admin/**
 * Extend with real auth + roles.
 */
@Configuration
public class SecurityConfig {

    @Bean
    SecurityFilterChain filterChain(
            HttpSecurity http,
            RequestCorrelationFilter requestCorrelationFilter,
            StoreResolverFilter storeResolverFilter,
            RateLimitFilter rateLimitFilter,
            JwtAuthenticationFilter jwtAuthenticationFilter,
            ApiAuthenticationEntryPoint apiAuthenticationEntryPoint,
            ApiAccessDeniedHandler apiAccessDeniedHandler,
            @Value("${app.observability.prometheus.scrapeEnabled:false}") boolean prometheusScrapeEnabled
    ) throws Exception {
        String[] publicActuatorEndpoints = prometheusScrapeEnabled
                ? new String[]{"/actuator/health/**", "/actuator/prometheus"}
                : new String[]{"/actuator/health/**"};

        http
            .csrf(csrf -> csrf.disable())
            .cors(Customizer.withDefaults())
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(publicActuatorEndpoints).permitAll()
                .requestMatchers("/actuator/**").authenticated()
                .requestMatchers("/api/webhooks/**").permitAll()
                .requestMatchers("/api/admin/dev/observability/**").permitAll()
                .requestMatchers("/api/public/**").permitAll()
                .requestMatchers("/api/auth/login", "/api/auth/refresh", "/api/auth/logout").permitAll()
                .requestMatchers("/api/auth/me").authenticated()
                .requestMatchers("/api/store/admin/**").authenticated()
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

        http.addFilterBefore(requestCorrelationFilter, UsernamePasswordAuthenticationFilter.class);
        http.addFilterBefore(storeResolverFilter, UsernamePasswordAuthenticationFilter.class);
        http.addFilterAfter(rateLimitFilter, StoreResolverFilter.class);
        http.addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    ApiAuthenticationEntryPoint apiAuthenticationEntryPoint(ObjectMapper objectMapper, MeterRegistry meterRegistry) {
        return new ApiAuthenticationEntryPoint(objectMapper, meterRegistry);
    }

    @Bean
    ApiAccessDeniedHandler apiAccessDeniedHandler(ObjectMapper objectMapper, MeterRegistry meterRegistry) {
        return new ApiAccessDeniedHandler(objectMapper, meterRegistry);
    }

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource(
            @Value("${app.security.allowedOrigins:http://localhost:5173,http://127.0.0.1:5173}") String allowedOrigins
    ) {
        CorsConfiguration configuration = new CorsConfiguration();
        List<String> origins = Arrays.stream(allowedOrigins.split(","))
                .map(String::trim)
                .filter(value -> !value.isBlank())
                .toList();
        configuration.setAllowedOrigins(origins);
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("Authorization", "Content-Type", "X-Request-Id", "X-Barmi-Webhook-Secret"));
        configuration.setExposedHeaders(List.of("X-Request-Id"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
