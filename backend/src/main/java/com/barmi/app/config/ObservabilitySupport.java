package com.barmi.app.config;

import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.MDC;

public final class ObservabilitySupport {
    private ObservabilitySupport() {
    }

    public static String requestId(HttpServletRequest request) {
        Object requestId = request == null ? null : request.getAttribute(RequestCorrelationFilter.REQUEST_ID_ATTRIBUTE);
        if (requestId instanceof String value && !value.isBlank()) {
            return value;
        }
        String mdcRequestId = MDC.get("requestId");
        return mdcRequestId == null || mdcRequestId.isBlank() ? "unknown" : mdcRequestId;
    }

    public static int retryCount(HttpServletRequest request) {
        if (request == null) {
            return 0;
        }
        return parseRetryHeader(request.getHeader("X-Retry-Count"), request.getHeader("Retry-Count"));
    }

    private static int parseRetryHeader(String... values) {
        if (values == null) {
            return 0;
        }
        for (String value : values) {
            if (value == null || value.isBlank()) {
                continue;
            }
            try {
                return Math.max(0, Integer.parseInt(value.trim()));
            } catch (NumberFormatException ignored) {
                return 0;
            }
        }
        return 0;
    }
}
