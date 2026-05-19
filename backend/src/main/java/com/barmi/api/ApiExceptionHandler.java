package com.barmi.api;

import com.barmi.app.config.ObservabilitySupport;
import com.barmi.app.domain.ErrorCategory;
import io.micrometer.core.instrument.MeterRegistry;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.servlet.resource.NoResourceFoundException;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;
import java.util.concurrent.TimeoutException;

@ControllerAdvice
public class ApiExceptionHandler {
    private static final Logger log = LoggerFactory.getLogger(ApiExceptionHandler.class);
    private final MeterRegistry meterRegistry;

    public ApiExceptionHandler(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<?> handleResponseStatus(ResponseStatusException ex, HttpServletRequest request) {
        String requestId = ObservabilitySupport.requestId(request);
        String code = ex.getReason() == null ? "error" : ex.getReason();
        ErrorCategory category = categorizeResponseStatus(ex, request);
        log.warn(
                "api_error category={} method={} path={} status={} request_id={} code={}",
                category.value(),
                request.getMethod(),
                request.getRequestURI(),
                ex.getStatusCode().value(),
                requestId,
                code
        );
        incrementMetrics(category, request, code);
        return buildErrorResponse(ex.getStatusCode().value(), code, "Request failed", requestId);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<?> handleIllegalArgument(IllegalArgumentException ex, HttpServletRequest request) {
        String requestId = ObservabilitySupport.requestId(request);
        ErrorCategory category = ErrorCategory.API_ERROR_INVALID_REQUEST;
        log.warn(
                "api_error category={} method={} path={} status={} request_id={} message={}",
                category.value(),
                request.getMethod(),
                request.getRequestURI(),
                HttpStatus.BAD_REQUEST.value(),
                requestId,
                ex.getMessage()
        );
        incrementMetrics(category, request, "bad_request");
        return buildErrorResponse(HttpStatus.BAD_REQUEST.value(), "bad_request", "Bad request", requestId);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<?> handleValidation(MethodArgumentNotValidException ex, HttpServletRequest request) {
        String requestId = ObservabilitySupport.requestId(request);
        ErrorCategory category = ErrorCategory.API_ERROR_INVALID_REQUEST;
        log.warn(
                "api_error category={} method={} path={} status={} request_id={} errors={}",
                category.value(),
                request.getMethod(),
                request.getRequestURI(),
                HttpStatus.BAD_REQUEST.value(),
                requestId,
                ex.getErrorCount()
        );
        incrementMetrics(category, request, "bad_request");
        return buildErrorResponse(HttpStatus.BAD_REQUEST.value(), "bad_request", "Bad request", requestId);
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<?> handleNoResourceFound(NoResourceFoundException ex, HttpServletRequest request) {
        String requestId = ObservabilitySupport.requestId(request);
        ErrorCategory category = ErrorCategory.API_ERROR_INVALID_REQUEST;
        log.warn(
                "api_error category={} method={} path={} status={} request_id={} message={}",
                category.value(),
                request.getMethod(),
                request.getRequestURI(),
                HttpStatus.NOT_FOUND.value(),
                requestId,
                ex.getMessage()
        );
        incrementMetrics(category, request, "not_found");
        return buildErrorResponse(HttpStatus.NOT_FOUND.value(), "not_found", "Not found", requestId);
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<?> handleIllegalState(IllegalStateException ex, HttpServletRequest request) {
        String requestId = ObservabilitySupport.requestId(request);
        ErrorCategory category = categorizeConflict(request);
        log.warn(
                "api_error category={} method={} path={} status={} request_id={} message={}",
                category.value(),
                request.getMethod(),
                request.getRequestURI(),
                HttpStatus.CONFLICT.value(),
                requestId,
                ex.getMessage()
        );
        incrementMetrics(category, request, "conflict");
        return buildErrorResponse(HttpStatus.CONFLICT.value(), "conflict", "Conflict", requestId);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<?> handleUnhandled(Exception ex, HttpServletRequest request) {
        String requestId = ObservabilitySupport.requestId(request);
        ErrorCategory category = categorizeUnhandled(ex, request);
        log.error(
                "api_error category={} method={} path={} status={} request_id={}",
                category.value(),
                request.getMethod(),
                request.getRequestURI(),
                HttpStatus.INTERNAL_SERVER_ERROR.value(),
                requestId,
                ex
        );
        incrementMetrics(category, request, "internal_error");
        return buildErrorResponse(HttpStatus.INTERNAL_SERVER_ERROR.value(), "internal_error", "Internal error", requestId);
    }

    private ErrorCategory categorizeResponseStatus(ResponseStatusException ex, HttpServletRequest request) {
        int status = ex.getStatusCode().value();
        String path = request.getRequestURI();
        if (status == 429) {
            return ErrorCategory.RATE_LIMIT_EXCEEDED;
        }
        if (path != null && path.startsWith("/api/auth/")) {
            return ErrorCategory.API_ERROR_AUTH_FAILURE;
        }
        if (path != null && path.contains("/webhook")) {
            return ErrorCategory.API_ERROR_WEBHOOK_FAILURE;
        }
        if (path != null && path.contains("/checkout")) {
            return ErrorCategory.API_ERROR_CHECKOUT_FAILURE;
        }
        if (status >= 400 && status < 500) {
            return ErrorCategory.API_ERROR_INVALID_REQUEST;
        }
        return ErrorCategory.API_ERROR_INTERNAL_BUG;
    }

    private ErrorCategory categorizeUnhandled(Exception ex, HttpServletRequest request) {
        String path = request.getRequestURI();
        if (ex instanceof RedisConnectionFailureException) {
            return ErrorCategory.API_ERROR_REDIS_UNAVAILABLE;
        }
        if (ex instanceof DataAccessException) {
            return ErrorCategory.API_ERROR_DB_UNAVAILABLE;
        }
        if (ex instanceof TimeoutException || ex instanceof ResourceAccessException) {
            return path != null && path.contains("/webhook")
                    ? ErrorCategory.API_ERROR_WEBHOOK_FAILURE
                    : ErrorCategory.API_ERROR_VENDOR_TIMEOUT;
        }
        if (path != null && path.startsWith("/api/auth/")) {
            return ErrorCategory.API_ERROR_AUTH_FAILURE;
        }
        if (path != null && path.contains("/webhook")) {
            return ErrorCategory.API_ERROR_WEBHOOK_FAILURE;
        }
        if (path != null && path.contains("/checkout")) {
            return ErrorCategory.API_ERROR_CHECKOUT_FAILURE;
        }
        return ErrorCategory.API_ERROR_INTERNAL_BUG;
    }

    private ErrorCategory categorizeConflict(HttpServletRequest request) {
        String path = request.getRequestURI();
        if (path != null && path.startsWith("/api/auth/")) {
            return ErrorCategory.API_ERROR_AUTH_FAILURE;
        }
        if (path != null && path.contains("/webhook")) {
            return ErrorCategory.API_ERROR_WEBHOOK_FAILURE;
        }
        if (path != null && path.contains("/checkout")) {
            return ErrorCategory.API_ERROR_CHECKOUT_FAILURE;
        }
        return ErrorCategory.API_ERROR_INVALID_REQUEST;
    }

    private void incrementMetrics(ErrorCategory category, HttpServletRequest request, String code) {
        meterRegistry.counter("barmi_api_errors_total", "category", category.value()).increment();
        String path = request.getRequestURI();
        if (path == null) {
            return;
        }
        if (path.startsWith("/api/auth/")) {
            meterRegistry.counter("barmi_auth_failures_total", "code", code).increment();
        }
        if (path.contains("/checkout")) {
            meterRegistry.counter("barmi_checkout_failures_total", "code", code).increment();
        }
        if (path.contains("webhook")) {
            meterRegistry.counter("barmi_webhook_failures_total", "code", code).increment();
        }
        if ("rate_limited".equals(code)) {
            meterRegistry.counter("barmi_rate_limited_total").increment();
        }
    }

    private ResponseEntity<?> buildErrorResponse(int status, String code, String message, String requestId) {
        return ResponseEntity.status(status).body(Map.of(
                "error", Map.of(
                        "code", code,
                        "message", message,
                        "status", status,
                        "requestId", requestId
                )
        ));
    }
}
