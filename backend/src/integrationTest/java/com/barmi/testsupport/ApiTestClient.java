package com.barmi.testsupport;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.Cookie;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.nio.charset.StandardCharsets;
import java.util.Map;

import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;

public class ApiTestClient {
    private static final ObjectMapper MAPPER = new ObjectMapper();

    private final MockMvc mockMvc;

    public ApiTestClient(MockMvc mockMvc) {
        this.mockMvc = mockMvc;
    }

    public ApiTestResponse postJson(String path, Object body, HttpHeaders headers) throws Exception {
        return exchange(MockMvcRequestBuilders.post(path), body, headers);
    }

    public ApiTestResponse postJson(String path, Object body, HttpHeaders headers, Cookie... cookies) throws Exception {
        return exchange(MockMvcRequestBuilders.post(path), body, headers, cookies);
    }

    public ApiTestResponse putJson(String path, Object body, HttpHeaders headers) throws Exception {
        return exchange(MockMvcRequestBuilders.put(path), body, headers);
    }

    public ApiTestResponse patchJson(String path, Object body, HttpHeaders headers) throws Exception {
        return exchange(MockMvcRequestBuilders.patch(path), body, headers);
    }

    public ApiTestResponse get(String path, HttpHeaders headers) throws Exception {
        return exchange(MockMvcRequestBuilders.get(path), null, headers);
    }

    public ApiTestResponse delete(String path, HttpHeaders headers) throws Exception {
        return exchange(MockMvcRequestBuilders.delete(path), null, headers);
    }

    public HttpHeaders storeHostHeaders(String storeSlug) {
        HttpHeaders headers = new HttpHeaders();
        String host = storeSlug + ".example.com";
        headers.set("Host", host);
        headers.set("X-Forwarded-Host", host);
        return headers;
    }

    public HttpHeaders withWebhookSecret(HttpHeaders headers, String secret) {
        headers.set("X-Barmi-Webhook-Secret", secret);
        return headers;
    }

    private ApiTestResponse exchange(MockHttpServletRequestBuilder builder, Object body, HttpHeaders headers) throws Exception {
        return exchange(builder, body, headers, new Cookie[0]);
    }

    private ApiTestResponse exchange(MockHttpServletRequestBuilder builder, Object body, HttpHeaders headers, Cookie... cookies) throws Exception {
        if (headers != null) {
            builder.headers(headers);
        }
        if (cookies != null && cookies.length > 0) {
            builder.cookie(cookies);
        }
        if (body != null) {
            builder.contentType(MediaType.APPLICATION_JSON);
            builder.content(Json.stringify(body));
        }

        MvcResult result = mockMvc.perform(builder).andReturn();
        int status = result.getResponse().getStatus();
        String content = result.getResponse().getContentAsString(StandardCharsets.UTF_8);
        Map<String, Object> bodyMap = null;
        if (content != null && !content.isBlank()) {
            bodyMap = MAPPER.readValue(content, new TypeReference<>() {});
        }
        HttpHeaders responseHeaders = new HttpHeaders();
        result.getResponse().getHeaderNames().forEach(name -> responseHeaders.put(name, result.getResponse().getHeaders(name)));
        Cookie[] responseCookies = result.getResponse().getCookies();
        return new ApiTestResponse(status, bodyMap, content, responseHeaders, responseCookies);
    }

    public record ApiTestResponse(int status, Map<String, Object> body, String rawBody, HttpHeaders headers, Cookie[] cookies) {}
}
