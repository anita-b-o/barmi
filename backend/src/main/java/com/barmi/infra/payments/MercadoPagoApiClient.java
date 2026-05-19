package com.barmi.infra.payments;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.math.BigDecimal;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.Map;

@Component
public class MercadoPagoApiClient {
    private static final Duration DEFAULT_TIMEOUT = Duration.ofSeconds(15);

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;
    private final String accessToken;
    private final String apiBaseUrl;

    public MercadoPagoApiClient(
            ObjectMapper objectMapper,
            @Value("${app.mercadoPago.accessToken:}") String accessToken,
            @Value("${app.mercadoPago.apiBaseUrl:https://api.mercadopago.com}") String apiBaseUrl
    ) {
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(DEFAULT_TIMEOUT)
                .build();
        this.accessToken = accessToken == null ? "" : accessToken.trim();
        this.apiBaseUrl = normalizeBaseUrl(apiBaseUrl);
    }

    public boolean isConfigured() {
        return !accessToken.isBlank();
    }

    public PreferenceResponse createPreference(PreferenceRequest request) {
        requireConfigured();
        try {
            HttpRequest httpRequest = HttpRequest.newBuilder()
                    .uri(URI.create(apiBaseUrl + "/checkout/preferences"))
                    .timeout(DEFAULT_TIMEOUT)
                    .header("Authorization", "Bearer " + accessToken)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(request)))
                    .build();

            HttpResponse<String> response = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() / 100 != 2) {
                throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "payment_provider_unavailable");
            }

            return objectMapper.readValue(response.body(), PreferenceResponse.class);
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "payment_provider_unavailable");
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "payment_provider_unavailable");
        }
    }

    public PaymentDetails getPayment(String paymentId) {
        requireConfigured();
        if (paymentId == null || paymentId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "missing_provider_payment_id");
        }
        try {
            String encodedPaymentId = URLEncoder.encode(paymentId.trim(), StandardCharsets.UTF_8);
            HttpRequest httpRequest = HttpRequest.newBuilder()
                    .uri(URI.create(apiBaseUrl + "/v1/payments/" + encodedPaymentId))
                    .timeout(DEFAULT_TIMEOUT)
                    .header("Authorization", "Bearer " + accessToken)
                    .header("Accept", "application/json")
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() / 100 != 2) {
                throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "payment_provider_unavailable");
            }

            return objectMapper.readValue(response.body(), PaymentDetails.class);
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "payment_provider_unavailable");
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "payment_provider_unavailable");
        }
    }

    private void requireConfigured() {
        if (accessToken.isBlank()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "payment_provider_unavailable");
        }
    }

    private String normalizeBaseUrl(String value) {
        String normalized = value == null || value.isBlank() ? "https://api.mercadopago.com" : value.trim();
        return normalized.endsWith("/") ? normalized.substring(0, normalized.length() - 1) : normalized;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record PreferenceResponse(
            @JsonAlias("id") String id,
            @JsonAlias("init_point") String initPoint,
            @JsonAlias("sandbox_init_point") String sandboxInitPoint
    ) {}

    public record PreferenceRequest(
            List<PreferenceItem> items,
            @JsonProperty("back_urls") PreferenceBackUrls backUrls,
            @JsonProperty("auto_return") String autoReturn,
            @JsonProperty("notification_url") String notificationUrl,
            @JsonProperty("external_reference") String externalReference,
            Map<String, Object> metadata
    ) {}

    public record PreferenceItem(
            String id,
            String title,
            String description,
            int quantity,
            @JsonProperty("currency_id") String currencyId,
            @JsonProperty("unit_price") BigDecimal unitPrice
    ) {}

    public record PreferenceBackUrls(
            String success,
            String pending,
            String failure
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record PaymentDetails(
            String id,
            String status,
            @JsonAlias("transaction_amount") BigDecimal transactionAmount,
            @JsonAlias("currency_id") String currencyId,
            @JsonAlias("external_reference") String externalReference,
            Map<String, Object> metadata
    ) {}
}
