package com.barmi.api;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
class BetaTelemetryFlowTest {

    @Autowired
    private MockMvc mockMvc;

    private void ingestTelemetryAndFeedbackFixture() throws Exception {
        mockMvc.perform(
                post("/api/public/beta/telemetry")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "eventName":"ecosystem_home_view",
                                  "ecosystemSlug":"demo-ecosystem",
                                  "sessionId":"session-1",
                                  "route":"/ecosystem",
                                  "releaseId":"rel-1",
                                  "environment":"test",
                                  "occurredAt":"2026-05-17T20:00:00Z",
                                  "metadata":{"surface":"home"}
                                }
                                """)
        ).andExpect(status().isAccepted());

        mockMvc.perform(
                post("/api/public/beta/telemetry")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "eventName":"search_used",
                                  "ecosystemSlug":"demo-ecosystem",
                                  "searchTerm":"pedido buyer@example.com",
                                  "sessionId":"session-1",
                                  "route":"/ecosystem/catalog?q=buyer@example.com",
                                  "releaseId":"rel-1",
                                  "environment":"test",
                                  "occurredAt":"2026-05-17T20:00:03Z"
                                }
                                """)
        ).andExpect(status().isAccepted());

        mockMvc.perform(
                post("/api/public/beta/telemetry")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "eventName":"search_no_results",
                                  "ecosystemSlug":"demo-ecosystem",
                                  "searchTerm":"cafes imposibles",
                                  "sessionId":"session-1",
                                  "route":"/ecosystem/catalog?q=cafes+imposibles",
                                  "releaseId":"rel-1",
                                  "environment":"test",
                                  "occurredAt":"2026-05-17T20:00:03Z",
                                  "metadata":{"surface":"ecosystem_catalog"}
                                }
                                """)
        ).andExpect(status().isAccepted());

        mockMvc.perform(
                post("/api/public/beta/telemetry")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "eventName":"store_view",
                                  "storeSlug":"demo-store",
                                  "storeName":"Cafe del Parque",
                                  "sessionId":"session-1",
                                  "route":"/store/demo-store",
                                  "releaseId":"rel-1",
                                  "environment":"test",
                                  "occurredAt":"2026-05-17T20:00:01Z"
                                }
                                """)
        ).andExpect(status().isAccepted());

        mockMvc.perform(
                post("/api/public/beta/telemetry")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "eventName":"checkout_failure",
                                  "storeSlug":"demo-store",
                                  "requestId":"checkout-request-1",
                                  "sessionId":"session-2",
                                  "route":"/store/checkout?token=abcdefghijklmnopqrstuvwxyz123456",
                                  "releaseId":"rel-1",
                                  "environment":"test",
                                  "occurredAt":"2026-05-17T20:00:07Z",
                                  "metadata":{"surface":"store_checkout","reason":"coupon_not_found"}
                                }
                                """)
        ).andExpect(status().isAccepted());

        mockMvc.perform(
                post("/api/public/beta/telemetry")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "eventName":"product_click",
                                  "ecosystemSlug":"demo-ecosystem",
                                  "productId":"prod-1",
                                  "sessionId":"session-1",
                                  "route":"/ecosystem/catalog",
                                  "releaseId":"rel-1",
                                  "environment":"test",
                                  "occurredAt":"2026-05-17T20:00:02Z"
                                }
                                """)
        ).andExpect(status().isAccepted());

        mockMvc.perform(
                post("/api/public/beta/telemetry")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "eventName":"payment_initiated",
                                  "storeSlug":"demo-store",
                                  "sessionId":"session-2",
                                  "route":"/store/orders/order-1",
                                  "releaseId":"rel-1",
                                  "environment":"test",
                                  "occurredAt":"2026-05-17T20:00:02Z"
                                }
                                """)
        ).andExpect(status().isAccepted());

        mockMvc.perform(
                post("/api/public/beta/telemetry")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "eventName":"search_used",
                                  "ecosystemSlug":"demo-ecosystem",
                                  "searchTerm":"cafes de especialidad",
                                  "sessionId":"session-1",
                                  "route":"/ecosystem/catalog?q=cafes",
                                  "releaseId":"rel-1",
                                  "environment":"test",
                                  "occurredAt":"2026-05-17T20:00:02Z"
                                }
                                """)
        ).andExpect(status().isAccepted());

        mockMvc.perform(
                post("/api/public/beta/telemetry")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "eventName":"search_used",
                                  "ecosystemSlug":"demo-ecosystem",
                                  "searchTerm":"buyer@example.com",
                                  "sessionId":"session-1",
                                  "route":"/ecosystem/catalog?q=buyer@example.com",
                                  "releaseId":"rel-1",
                                  "environment":"test",
                                  "occurredAt":"2026-05-17T20:00:03Z"
                                }
                                """)
        ).andExpect(status().isAccepted());

        mockMvc.perform(
                post("/api/public/beta/telemetry")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "eventName":"checkout_started",
                                  "storeSlug":"demo-store",
                                  "sessionId":"session-2",
                                  "route":"/store/checkout",
                                  "releaseId":"rel-1",
                                  "environment":"test",
                                  "occurredAt":"2026-05-17T20:00:04Z"
                                }
                                """)
        ).andExpect(status().isAccepted());

        mockMvc.perform(
                post("/api/public/beta/telemetry")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "eventName":"checkout_success",
                                  "storeSlug":"demo-store",
                                  "sessionId":"session-2",
                                  "route":"/store/checkout/success",
                                  "releaseId":"rel-1",
                                  "environment":"test",
                                  "occurredAt":"2026-05-17T20:00:05Z"
                                }
                                """)
        ).andExpect(status().isAccepted());

        mockMvc.perform(
                post("/api/public/beta/telemetry")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "eventName":"login_failure",
                                  "sessionId":"session-3",
                                  "route":"/login",
                                  "releaseId":"rel-1",
                                  "environment":"test",
                                  "occurredAt":"2026-05-17T20:00:06Z"
                                }
                                """)
        ).andExpect(status().isAccepted());

        mockMvc.perform(
                post("/api/public/beta/feedback")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "category":"confusing",
                                  "score":4,
                                  "message":"No entendí si el pago empieza antes o después de crear la orden.",
                                  "route":"/store/checkout?email=buyer@example.com",
                                  "storeSlug":"demo-store",
                                  "requestId":"feedback-request-1",
                                  "sessionId":"session-2",
                                  "releaseId":"rel-1",
                                  "environment":"test"
                                }
                                """)
        ).andExpect(status().isAccepted());
    }

    @WithMockUser
    @Test
    void exposesAdminBetaSummary() throws Exception {
        ingestTelemetryAndFeedbackFixture();

        mockMvc.perform(get("/api/admin/beta/summary"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.homeViews").value(1))
                .andExpect(jsonPath("$.storeViews").value(1))
                .andExpect(jsonPath("$.searchUses").value(3))
                .andExpect(jsonPath("$.searchNoResults").value(1))
                .andExpect(jsonPath("$.productClicks").value(1))
                .andExpect(jsonPath("$.checkoutStarted").value(1))
                .andExpect(jsonPath("$.paymentInitiated").value(1))
                .andExpect(jsonPath("$.checkoutSuccess").value(1))
                .andExpect(jsonPath("$.checkoutFailure").value(1))
                .andExpect(jsonPath("$.checkoutAbandoned").value(0))
                .andExpect(jsonPath("$.checkoutSuccessRate").value(100.0))
                .andExpect(jsonPath("$.loginFailure").value(1))
                .andExpect(jsonPath("$.loginFailureRate").value(100.0))
                .andExpect(jsonPath("$.feedbackSubmitted").value(1))
                .andExpect(jsonPath("$.feedbackConfusing").value(1))
                .andExpect(jsonPath("$.topStores[0].storeSlug").value("demo-store"))
                .andExpect(jsonPath("$.topSearches[0].query").value("cafes de especialidad"))
                .andExpect(jsonPath("$.feedbackRoutes[0].route").value("/store/checkout"))
                .andExpect(jsonPath("$.recentFeedback[0].requestId").value("feedback-request-1"))
                .andExpect(jsonPath("$.recentFailures[0].eventName").value("checkout_failure"))
                .andExpect(jsonPath("$.recentFailures[0].route").value("/store/checkout"))
                .andExpect(jsonPath("$.recentFailures[0].reason").value("coupon_not_found"));
    }
}
