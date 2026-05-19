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
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.web.access.AccessDeniedHandler;

import java.io.IOException;
import java.util.Map;

public class ApiAccessDeniedHandler implements AccessDeniedHandler {
    private static final Logger log = LoggerFactory.getLogger(ApiAccessDeniedHandler.class);

    private final ObjectMapper objectMapper;
    private final MeterRegistry meterRegistry;

    public ApiAccessDeniedHandler(ObjectMapper objectMapper, MeterRegistry meterRegistry) {
        this.objectMapper = objectMapper;
        this.meterRegistry = meterRegistry;
    }

    @Override
    public void handle(
            HttpServletRequest request,
            HttpServletResponse response,
            AccessDeniedException accessDeniedException
    ) throws IOException {
        if (response.isCommitted()) return;
        String requestId = ObservabilitySupport.requestId(request);
        log.warn(
                "api_error category={} method={} path={} status={} request_id={} code=forbidden",
                ErrorCategory.API_ERROR_AUTH_FAILURE.value(),
                request.getMethod(),
                request.getRequestURI(),
                HttpServletResponse.SC_FORBIDDEN,
                requestId
        );
        meterRegistry.counter("barmi_api_errors_total", "category", ErrorCategory.API_ERROR_AUTH_FAILURE.value()).increment();
        meterRegistry.counter("barmi_auth_failures_total", "code", "forbidden").increment();

        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);

        Map<String, Object> body = Map.of(
                "error", Map.of(
                        "code", "forbidden",
                        "message", "Forbidden",
                        "status", HttpServletResponse.SC_FORBIDDEN,
                        "requestId", requestId
                )
        );

        objectMapper.writeValue(response.getOutputStream(), body);
    }
}
