package com.barmi.app.ratelimit;

import com.barmi.app.auth.AuthCookieService;
import com.barmi.app.config.RequestCorrelationFilter;
import com.barmi.app.tenant.TenantContext;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.util.AntPathMatcher;

import java.io.IOException;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Component
public class RateLimitFilter extends OncePerRequestFilter {
    private static final Logger log = LoggerFactory.getLogger(RateLimitFilter.class);

    private final ObjectMapper objectMapper;
    private final AuthCookieService authCookieService;
    private final RedisFixedWindowRateLimiter rateLimiter;
    private final ClientIpResolver clientIpResolver;
    private final int maxCachedBodyBytes;
    private final Counter rateLimitedCounter;
    private final List<RateLimitPolicy> policies;
    private final AntPathMatcher antPathMatcher = new AntPathMatcher();

    public RateLimitFilter(
            ObjectMapper objectMapper,
            AuthCookieService authCookieService,
            RedisFixedWindowRateLimiter rateLimiter,
            MeterRegistry meterRegistry,
            @Value("${app.tenant.trustProxyHeaders:false}") boolean trustProxyHeaders,
            @Value("${app.rateLimit.maxCachedBodyBytes:262144}") int maxCachedBodyBytes
    ) {
        this.objectMapper = objectMapper;
        this.authCookieService = authCookieService;
        this.rateLimiter = rateLimiter;
        this.clientIpResolver = new ClientIpResolver(trustProxyHeaders);
        this.maxCachedBodyBytes = maxCachedBodyBytes;
        this.rateLimitedCounter = meterRegistry.counter("barmi_rate_limited_total");
        this.policies = buildPolicies();
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return path == null || path.startsWith("/actuator/health");
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        RateLimitPolicy policy = findPolicy(request);
        if (policy == null) {
            filterChain.doFilter(request, response);
            return;
        }

        HttpServletRequest requestToUse;
        try {
            requestToUse = wrapIfNeeded(request);
        } catch (CachedBodyHttpServletRequest.BodyTooLargeException exception) {
            writePayloadTooLargeResponse(
                    response,
                    String.valueOf(request.getAttribute(RequestCorrelationFilter.REQUEST_ID_ATTRIBUTE)),
                    exception.maxBodyBytes()
            );
            return;
        }

        RequestView requestView = new RequestView(requestToUse);
        for (LimitRule rule : policy.rules()) {
            String rawKey = rule.keyBuilder().build(requestView);
            RedisFixedWindowRateLimiter.RateLimitDecision decision = rateLimiter.check(
                    rule.limiterName(),
                    rawKey,
                    rule.limit(),
                    rule.window()
            );

            if (decision.backendRecovered()) {
                log.info(
                        "rate_limit_backend_recovered limiter={} route={} request_id={}",
                        rule.limiterName(),
                        requestToUse.getRequestURI(),
                        requestToUse.getAttribute(RequestCorrelationFilter.REQUEST_ID_ATTRIBUTE)
                );
            }

            if (decision.backendUnavailable()) {
                if (decision.firstUnavailable()) {
                    log.warn(
                            "rate_limit_backend_unavailable limiter={} route={} request_id={} anonymized_key={}",
                            rule.limiterName(),
                            requestToUse.getRequestURI(),
                            requestToUse.getAttribute(RequestCorrelationFilter.REQUEST_ID_ATTRIBUTE),
                            decision.anonymizedKey()
                    );
                }
                continue;
            }

            if (!decision.allowed()) {
                rateLimitedCounter.increment();
                log.warn(
                        "rate_limited category=rate_limit_exceeded limiter={} route={} request_id={} anonymized_key={} retry_after_seconds={}",
                        rule.limiterName(),
                        requestToUse.getRequestURI(),
                        requestToUse.getAttribute(RequestCorrelationFilter.REQUEST_ID_ATTRIBUTE),
                        decision.anonymizedKey(),
                        decision.retryAfterSeconds()
                );
                writeRateLimitResponse(response, decision.retryAfterSeconds(), String.valueOf(requestToUse.getAttribute(RequestCorrelationFilter.REQUEST_ID_ATTRIBUTE)));
                return;
            }
        }

        filterChain.doFilter(requestToUse, response);
    }

    private HttpServletRequest wrapIfNeeded(HttpServletRequest request) throws IOException {
        if (request instanceof CachedBodyHttpServletRequest) {
            return request;
        }
        String method = request.getMethod();
        if (HttpMethod.POST.matches(method) || HttpMethod.PUT.matches(method) || HttpMethod.PATCH.matches(method)) {
            return new CachedBodyHttpServletRequest(request, maxCachedBodyBytes);
        }
        return request;
    }

    private RateLimitPolicy findPolicy(HttpServletRequest request) {
        String method = request.getMethod();
        String path = request.getRequestURI();
        for (RateLimitPolicy policy : policies) {
            if (policy.matches(method, path)) {
                return policy;
            }
        }
        return null;
    }

    private void writeRateLimitResponse(HttpServletResponse response, long retryAfterSeconds, String requestId) throws IOException {
        response.setStatus(429);
        response.setHeader("Retry-After", Long.toString(Math.max(1L, retryAfterSeconds)));
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.getWriter().write("{\"error\":{\"code\":\"rate_limited\",\"message\":\"Too many requests\",\"status\":429,\"requestId\":\"" + requestId + "\"}}");
    }

    private void writePayloadTooLargeResponse(HttpServletResponse response, String requestId, int maxBodyBytes) throws IOException {
        response.setStatus(413);
        response.setHeader("X-Max-Request-Body-Bytes", Integer.toString(maxBodyBytes));
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.getWriter().write("{\"error\":{\"code\":\"payload_too_large\",\"message\":\"Payload too large\",\"status\":413,\"requestId\":\"" + requestId + "\"}}");
    }

    private List<RateLimitPolicy> buildPolicies() {
        List<RateLimitPolicy> items = new ArrayList<>();

        items.add(new RateLimitPolicy(
                HttpMethod.POST.name(),
                "/api/auth/login",
                List.of(
                        new LimitRule("auth_login_ip", 5, Duration.ofMinutes(1), RequestView::ipRouteKey),
                        new LimitRule("auth_login_email_ip", 20, Duration.ofMinutes(15), RequestView::loginEmailKey)
                )
        ));
        items.add(new RateLimitPolicy(
                HttpMethod.POST.name(),
                "/api/auth/refresh",
                List.of(
                        new LimitRule("auth_refresh_ip", 20, Duration.ofMinutes(1), RequestView::ipRouteKey),
                        new LimitRule("auth_refresh_fingerprint", 60, Duration.ofMinutes(15), RequestView::refreshFingerprintKey)
                )
        ));
        items.add(new RateLimitPolicy(
                HttpMethod.POST.name(),
                "/api/auth/logout",
                List.of(new LimitRule("auth_logout_ip", 30, Duration.ofMinutes(1), RequestView::ipRouteKey))
        ));
        items.add(new RateLimitPolicy(
                HttpMethod.POST.name(),
                "/api/store/checkout/preview",
                List.of(new LimitRule("store_checkout_preview", 30, Duration.ofMinutes(1), RequestView::storeScopeKey))
        ));
        items.add(new RateLimitPolicy(
                HttpMethod.POST.name(),
                "/api/store/checkout",
                List.of(new LimitRule("store_checkout", 10, Duration.ofMinutes(5), RequestView::storeScopeKey))
        ));
        items.add(new RateLimitPolicy(
                HttpMethod.POST.name(),
                "/api/ecosystem/checkout/preview",
                List.of(new LimitRule("ecosystem_checkout_preview", 30, Duration.ofMinutes(1), RequestView::ecosystemScopeKey))
        ));
        items.add(new RateLimitPolicy(
                HttpMethod.POST.name(),
                "/api/ecosystem/checkout",
                List.of(new LimitRule("ecosystem_checkout", 10, Duration.ofMinutes(5), RequestView::ecosystemScopeKey))
        ));
        items.add(new RateLimitPolicy(
                HttpMethod.POST.name(),
                "/api/store/payments/initiate",
                List.of(
                        new LimitRule("store_payment_initiate_ip_order", 10, Duration.ofMinutes(10), RequestView::storePaymentOrderIpKey),
                        new LimitRule("store_payment_initiate_order", 3, Duration.ofMinutes(1), RequestView::storePaymentOrderKey)
                )
        ));
        items.add(new RateLimitPolicy(
                HttpMethod.POST.name(),
                "/api/ecosystem/payments/initiate",
                List.of(
                        new LimitRule("ecosystem_payment_initiate_ip_order", 10, Duration.ofMinutes(10), RequestView::ecosystemPaymentOrderIpKey),
                        new LimitRule("ecosystem_payment_initiate_order", 3, Duration.ofMinutes(1), RequestView::ecosystemPaymentOrderKey)
                )
        ));
        items.add(new RateLimitPolicy(
                HttpMethod.GET.name(),
                "/api/public/ecosystems/*/home",
                List.of(new LimitRule("public_ecosystem_home", 120, Duration.ofMinutes(1), RequestView::ipRouteKey))
        ));
        items.add(new RateLimitPolicy(
                HttpMethod.GET.name(),
                "/api/public/**",
                List.of(new LimitRule("public_discovery", 60, Duration.ofMinutes(1), RequestView::ipRouteKey))
        ));
        items.add(new RateLimitPolicy(
                HttpMethod.GET.name(),
                "/api/store/shipping/quote",
                List.of(new LimitRule("store_shipping_quote", 60, Duration.ofMinutes(1), RequestView::ipRouteKey))
        ));
        items.add(new RateLimitPolicy(
                HttpMethod.GET.name(),
                "/api/ecosystem/shipping/quote",
                List.of(new LimitRule("ecosystem_shipping_quote", 60, Duration.ofMinutes(1), RequestView::ipRouteKey))
        ));
        items.add(new RateLimitPolicy(
                HttpMethod.POST.name(),
                "/api/webhooks/mercadopago",
                List.of(
                        new LimitRule("mercadopago_webhook_route", 120, Duration.ofMinutes(1), RequestView::ipRouteKey),
                        new LimitRule("mercadopago_webhook_event", 10, Duration.ofMinutes(1), RequestView::webhookEventKey)
                )
        ));
        items.add(new RateLimitPolicy(
                HttpMethod.POST.name(),
                "/api/payments/mercadopago/ecosystem/webhook",
                List.of(
                        new LimitRule("mercadopago_ecosystem_webhook_route", 120, Duration.ofMinutes(1), RequestView::ipRouteKey),
                        new LimitRule("mercadopago_ecosystem_webhook_event", 10, Duration.ofMinutes(1), RequestView::webhookEventKey)
                )
        ));
        return items;
    }

    private final class RateLimitPolicy {
        private final String method;
        private final String pattern;
        private final List<LimitRule> rules;

        private RateLimitPolicy(String method, String pattern, List<LimitRule> rules) {
            this.method = method;
            this.pattern = pattern;
            this.rules = rules;
        }

        boolean matches(String requestMethod, String path) {
            return method.equalsIgnoreCase(requestMethod) && antPathMatcher.match(pattern, path);
        }

        List<LimitRule> rules() {
            return rules;
        }
    }

    private record LimitRule(String limiterName, long limit, Duration window, KeyBuilder keyBuilder) {}

    @FunctionalInterface
    private interface KeyBuilder {
        String build(RequestView requestView);
    }

    private final class RequestView {
        private static final String JSON_ATTRIBUTE = RateLimitFilter.class.getName() + ".jsonBody";

        private final HttpServletRequest request;

        private RequestView(HttpServletRequest request) {
            this.request = request;
        }

        private String ipRouteKey() {
            return compose(ipAddress(), request.getRequestURI());
        }

        private String loginEmailKey() {
            String email = jsonText("email");
            return compose(ipAddress(), request.getRequestURI(), normalize(email));
        }

        private String refreshFingerprintKey() {
            String refreshToken = authCookieService.resolveRefreshToken(request);
            String fingerprint = refreshToken == null || refreshToken.isBlank()
                    ? cookieFallbackFingerprint()
                    : rateLimiter.anonymize(refreshToken);
            return compose(request.getRequestURI(), fingerprint);
        }

        private String storeScopeKey() {
            String storeSlug = TenantContext.getStoreSlug();
            return compose(ipAddress(), request.getRequestURI(), normalize(storeSlug));
        }

        private String ecosystemScopeKey() {
            String ecosystemId = jsonText("ecosystemId");
            return compose(ipAddress(), request.getRequestURI(), normalize(ecosystemId));
        }

        private String storePaymentOrderIpKey() {
            return compose(ipAddress(), request.getRequestURI(), normalize(jsonText("orderId")));
        }

        private String storePaymentOrderKey() {
            return compose(request.getRequestURI(), normalize(jsonText("orderId")));
        }

        private String ecosystemPaymentOrderIpKey() {
            return compose(ipAddress(), request.getRequestURI(), normalize(jsonText("orderId")));
        }

        private String ecosystemPaymentOrderKey() {
            return compose(request.getRequestURI(), normalize(jsonText("orderId")));
        }

        private String webhookEventKey() {
            JsonNode body = body();
            String eventId = text(body, "event_id");
            if (eventId == null) eventId = text(body, "eventId");
            if (eventId == null) eventId = text(body, "id");
            if (eventId == null) {
                eventId = compose(
                        normalize(text(body, "provider_payment_id")),
                        normalize(text(body, "payment_id")),
                        normalize(text(body, "operation_id"))
                );
            }
            return compose(request.getRequestURI(), normalize(eventId));
        }

        private String cookieFallbackFingerprint() {
            Cookie[] cookies = request.getCookies();
            if (cookies == null || cookies.length == 0) {
                return "missing-cookie";
            }
            StringBuilder builder = new StringBuilder();
            for (Cookie cookie : cookies) {
                builder.append(cookie.getName()).append('=').append(cookie.getValue()).append(';');
            }
            return rateLimiter.anonymize(builder.toString());
        }

        private JsonNode body() {
            Object cached = request.getAttribute(JSON_ATTRIBUTE);
            if (cached instanceof JsonNode jsonNode) {
                return jsonNode;
            }
            JsonNode parsed = objectMapper.createObjectNode();
            try {
                if (request instanceof CachedBodyHttpServletRequest cachedRequest) {
                    byte[] body = cachedRequest.getCachedBody();
                    if (body.length > 0) {
                        parsed = objectMapper.readTree(body);
                    }
                }
            } catch (Exception ignored) {
                parsed = objectMapper.createObjectNode();
            }
            request.setAttribute(JSON_ATTRIBUTE, parsed);
            return parsed;
        }

        private String jsonText(String field) {
            return text(body(), field);
        }

        private String text(JsonNode body, String field) {
            JsonNode node = body.get(field);
            if (node == null || node.isNull()) {
                return null;
            }
            String value = node.asText(null);
            return value == null || value.isBlank() ? null : value;
        }

        private String ipAddress() {
            return clientIpResolver.resolve(request);
        }

        private String normalize(String value) {
            if (value == null || value.isBlank()) {
                return "unknown";
            }
            return value.trim().toLowerCase(Locale.ROOT);
        }

        private String compose(String... values) {
            StringBuilder builder = new StringBuilder();
            for (String value : values) {
                if (builder.length() > 0) {
                    builder.append('|');
                }
                builder.append(value == null || value.isBlank() ? "unknown" : value.trim());
            }
            return builder.toString();
        }
    }
}
