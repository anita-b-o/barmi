package com.barmi.app.security;

import com.barmi.app.config.ObservabilitySupport;
import com.barmi.app.domain.ErrorCategory;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.micrometer.core.instrument.MeterRegistry;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;

import java.io.IOException;
import java.util.Map;

public class ApiAuthenticationEntryPoint implements AuthenticationEntryPoint {
    private static final Logger log = LoggerFactory.getLogger(ApiAuthenticationEntryPoint.class);

    private final ObjectMapper objectMapper;
    private final MeterRegistry meterRegistry;

    public ApiAuthenticationEntryPoint(ObjectMapper objectMapper, MeterRegistry meterRegistry) {
        this.objectMapper = objectMapper;
        this.meterRegistry = meterRegistry;
    }

    @Override
    public void commence(
            HttpServletRequest request,
            HttpServletResponse response,
            AuthenticationException authException
    ) throws IOException {
        if (response.isCommitted()) return;
        String requestId = ObservabilitySupport.requestId(request);
        String reason = (String) request.getAttribute(JwtAuthenticationFilter.AUTH_FAILURE_REASON_ATTRIBUTE);
        String code = reason == null || reason.isBlank() ? "unauthorized" : reason;

        log.warn(
                "api_error category={} method={} path={} status={} request_id={} code={}",
                ErrorCategory.API_ERROR_AUTH_FAILURE.value(),
                request.getMethod(),
                request.getRequestURI(),
                HttpServletResponse.SC_UNAUTHORIZED,
                requestId,
                code
        );
        meterRegistry.counter("barmi_api_errors_total", "category", ErrorCategory.API_ERROR_AUTH_FAILURE.value()).increment();
        meterRegistry.counter("barmi_auth_failures_total", "code", code).increment();

        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);

        Map<String, Object> body = Map.of(
                "error", Map.of(
                        "code", code,
                        "message", "Unauthorized",
                        "status", HttpServletResponse.SC_UNAUTHORIZED,
                        "requestId", requestId
                )
        );

        objectMapper.writeValue(response.getOutputStream(), body);
    }
}
