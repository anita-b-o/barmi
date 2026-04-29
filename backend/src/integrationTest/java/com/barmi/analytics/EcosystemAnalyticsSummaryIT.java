package com.barmi.analytics;

import com.barmi.PostgresIntegrationTestBase;
import com.barmi.domain.ecosystem.Ecosystem;
import com.barmi.domain.ecosystem.EcosystemExternalProduct;
import com.barmi.domain.ecosystem.EcosystemMember;
import com.barmi.domain.ecosystem.EcosystemMemberRole;
import com.barmi.domain.ecosystem.EcosystemMemberStatus;
import com.barmi.domain.fulfillment.EcosystemFulfillment;
import com.barmi.domain.fulfillment.FulfillmentStatus;
import com.barmi.domain.enums.PaymentScope;
import com.barmi.domain.orders.EcosystemOrder;
import com.barmi.domain.orders.EcosystemOrderItem;
import com.barmi.domain.payments.Payment;
import com.barmi.domain.payments.PaymentStatus;
import com.barmi.domain.users.User;
import com.barmi.domain.users.UserStatus;
import com.barmi.infra.repo.EcosystemExternalProductRepository;
import com.barmi.infra.repo.EcosystemFulfillmentRepository;
import com.barmi.infra.repo.EcosystemMemberRepository;
import com.barmi.infra.repo.EcosystemOrderRepository;
import com.barmi.infra.repo.EcosystemRepository;
import com.barmi.infra.repo.PaymentRepository;
import com.barmi.infra.repo.RefreshTokenRepository;
import com.barmi.infra.repo.StoreMemberRepository;
import com.barmi.infra.repo.UserRepository;
import com.barmi.testsupport.ApiTestClient;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@Testcontainers
@AutoConfigureMockMvc
class EcosystemAnalyticsSummaryIT extends PostgresIntegrationTestBase {

    private final ApiTestClient api;
    private final EcosystemRepository ecosystemRepository;
    private final EcosystemOrderRepository ecosystemOrderRepository;
    private final EcosystemFulfillmentRepository ecosystemFulfillmentRepository;
    private final EcosystemExternalProductRepository ecosystemExternalProductRepository;
    private final EcosystemMemberRepository ecosystemMemberRepository;
    private final PaymentRepository paymentRepository;
    private final StoreMemberRepository storeMemberRepository;
    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JdbcTemplate jdbcTemplate;

    private Ecosystem ecosystem;
    private Ecosystem otherEcosystem;
    private User adminUser;
    private User staffUser;
    private User otherAdminUser;

    @Autowired
    EcosystemAnalyticsSummaryIT(
            org.springframework.test.web.servlet.MockMvc mockMvc,
            EcosystemRepository ecosystemRepository,
            EcosystemOrderRepository ecosystemOrderRepository,
            EcosystemFulfillmentRepository ecosystemFulfillmentRepository,
            EcosystemExternalProductRepository ecosystemExternalProductRepository,
            EcosystemMemberRepository ecosystemMemberRepository,
            PaymentRepository paymentRepository,
            StoreMemberRepository storeMemberRepository,
            UserRepository userRepository,
            RefreshTokenRepository refreshTokenRepository,
            PasswordEncoder passwordEncoder,
            JdbcTemplate jdbcTemplate
    ) {
        this.api = new ApiTestClient(mockMvc);
        this.ecosystemRepository = ecosystemRepository;
        this.ecosystemOrderRepository = ecosystemOrderRepository;
        this.ecosystemFulfillmentRepository = ecosystemFulfillmentRepository;
        this.ecosystemExternalProductRepository = ecosystemExternalProductRepository;
        this.ecosystemMemberRepository = ecosystemMemberRepository;
        this.paymentRepository = paymentRepository;
        this.storeMemberRepository = storeMemberRepository;
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.jdbcTemplate = jdbcTemplate;
    }

    @BeforeEach
    void setup() {
        refreshTokenRepository.deleteAll();
        storeMemberRepository.deleteAll();
        ecosystemMemberRepository.deleteAll();
        ecosystemFulfillmentRepository.deleteAll();
        paymentRepository.deleteAll();
        ecosystemOrderRepository.deleteAll();
        ecosystemExternalProductRepository.deleteAll();
        userRepository.deleteAll();
        ecosystemRepository.deleteAll();

        ecosystem = ecosystemRepository.save(new Ecosystem(UUID.randomUUID(), "Analytics Eco", "analytics-eco-" + UUID.randomUUID()));
        otherEcosystem = ecosystemRepository.save(new Ecosystem(UUID.randomUUID(), "Analytics Eco 2", "analytics-eco-2-" + UUID.randomUUID()));

        adminUser = userRepository.save(new User(UUID.randomUUID(), "eco-admin-" + UUID.randomUUID() + "@example.com", passwordEncoder.encode("secret"), UserStatus.ACTIVE));
        staffUser = userRepository.save(new User(UUID.randomUUID(), "eco-staff-" + UUID.randomUUID() + "@example.com", passwordEncoder.encode("secret"), UserStatus.ACTIVE));
        otherAdminUser = userRepository.save(new User(UUID.randomUUID(), "eco-admin-2-" + UUID.randomUUID() + "@example.com", passwordEncoder.encode("secret"), UserStatus.ACTIVE));

        ecosystemMemberRepository.save(new EcosystemMember(UUID.randomUUID(), adminUser.getId(), ecosystem.getId(), EcosystemMemberRole.ECOSYSTEM_ADMIN, EcosystemMemberStatus.ACTIVE));
        ecosystemMemberRepository.save(new EcosystemMember(UUID.randomUUID(), staffUser.getId(), ecosystem.getId(), EcosystemMemberRole.ECOSYSTEM_STAFF, EcosystemMemberStatus.ACTIVE));
        ecosystemMemberRepository.save(new EcosystemMember(UUID.randomUUID(), otherAdminUser.getId(), otherEcosystem.getId(), EcosystemMemberRole.ECOSYSTEM_ADMIN, EcosystemMemberStatus.ACTIVE));

        EcosystemOrder pending = createOrder(ecosystem, new BigDecimal("100.00"));
        EcosystemOrder paid = createOrder(ecosystem, new BigDecimal("350.00"));
        paid.markPaid();
        EcosystemOrder cancelled = createOrder(ecosystem, new BigDecimal("80.00"));
        cancelled.cancel();
        ecosystemOrderRepository.saveAll(List.of(pending, paid, cancelled));

        EcosystemOrder otherPaid = createOrder(otherEcosystem, new BigDecimal("990.00"));
        otherPaid.markPaid();
        ecosystemOrderRepository.save(otherPaid);

        ecosystemFulfillmentRepository.saveAll(List.of(
                new EcosystemFulfillment(UUID.randomUUID(), paid.getId(), ecosystem.getId(), "DELIVERY", FulfillmentStatus.DISPATCHED),
                new EcosystemFulfillment(UUID.randomUUID(), pending.getId(), ecosystem.getId(), "DELIVERY", FulfillmentStatus.CANCELLED),
                new EcosystemFulfillment(UUID.randomUUID(), otherPaid.getId(), otherEcosystem.getId(), "DELIVERY", FulfillmentStatus.PENDING)
        ));

        ecosystemExternalProductRepository.saveAll(List.of(
                new EcosystemExternalProduct(UUID.randomUUID(), ecosystem, "Naranja", new BigDecimal("10.00"), "ARS", true),
                new EcosystemExternalProduct(UUID.randomUUID(), ecosystem, "Banana", new BigDecimal("20.00"), "ARS", true),
                new EcosystemExternalProduct(UUID.randomUUID(), otherEcosystem, "Ajeno", new BigDecimal("30.00"), "ARS", true)
        ));
        EcosystemExternalProduct inactive = ecosystemExternalProductRepository.save(new EcosystemExternalProduct(UUID.randomUUID(), ecosystem, "Kiwi", new BigDecimal("15.00"), "ARS", true));
        inactive.setActive(false);
        ecosystemExternalProductRepository.save(inactive);
    }

    @Test
    void returnsScopedEcosystemSummaryAndExcludesCancelledFromConfirmedSales() throws Exception {
        ApiTestClient.ApiTestResponse response = api.get(
                "/api/ecosystem/admin/analytics/summary?ecosystemId=" + ecosystem.getId(),
                adminHeaders(adminUser)
        );

        assertThat(response.status()).isEqualTo(200);
        assertThat(response.body().get("ecosystemId")).isEqualTo(ecosystem.getId().toString());
        assertThat(response.body().get("ecosystemSlug")).isEqualTo(ecosystem.getSlug());
        assertThat(response.body().get("totalOrders")).isEqualTo(3);
        assertThat(response.body().get("confirmedSalesTotalAmount")).isEqualTo(350.00);
        assertThat(response.body().get("confirmedSalesCurrency")).isEqualTo("ARS");
        assertThat(response.body().get("activeExternalProducts")).isEqualTo(2);
        assertThat(response.body().get("inactiveExternalProducts")).isEqualTo(1);

        Map<String, Object> ordersByStatus = castMap(response.body().get("ordersByStatus"));
        assertThat(ordersByStatus).containsEntry("PENDING_PAYMENT", 1).containsEntry("PAID", 1).containsEntry("CANCELLED", 1);

        Map<String, Object> fulfillmentsByStatus = castMap(response.body().get("fulfillmentsByStatus"));
        assertThat(fulfillmentsByStatus).containsEntry("DISPATCHED", 1).containsEntry("CANCELLED", 1).containsEntry("PENDING", 0);
    }

    @Test
    void enforcesAdminRoleAndEcosystemIsolation() throws Exception {
        ApiTestClient.ApiTestResponse forbidden = api.get(
                "/api/ecosystem/admin/analytics/summary?ecosystemId=" + ecosystem.getId(),
                adminHeaders(staffUser)
        );
        assertThat(forbidden.status()).isEqualTo(403);
        assertThat(errorCode(forbidden)).isEqualTo("forbidden");

        ApiTestClient.ApiTestResponse other = api.get(
                "/api/ecosystem/admin/analytics/summary?ecosystemId=" + otherEcosystem.getId(),
                adminHeaders(otherAdminUser)
        );
        assertThat(other.status()).isEqualTo(200);
        assertThat(other.body().get("totalOrders")).isEqualTo(1);
        assertThat(other.body().get("confirmedSalesTotalAmount")).isEqualTo(990.00);
    }

    @Test
    void returnsOperationalReportForRangeAndUsesCurrentFulfillmentSnapshot() throws Exception {
        Instant now = Instant.now();
        shiftExistingOperationalDataOutsideWindow(ecosystem.getId(), now.minusSeconds(20 * 24L * 60L * 60L));

        EcosystemOrder recentOrder = createOrder(ecosystem, new BigDecimal("120.00"));
        EcosystemOrder recentPaidOrder = createOrder(ecosystem, new BigDecimal("240.00"));
        recentPaidOrder.markPaid();
        EcosystemOrder olderOrder = createOrder(ecosystem, new BigDecimal("80.00"));
        ecosystemOrderRepository.saveAll(List.of(recentOrder, recentPaidOrder, olderOrder));

        setOrderCreatedAt(recentOrder.getId(), now.minusSeconds(2 * 24L * 60L * 60L));
        setOrderCreatedAt(recentPaidOrder.getId(), now.minusSeconds(3 * 24L * 60L * 60L));
        setOrderCreatedAt(olderOrder.getId(), now.minusSeconds(12 * 24L * 60L * 60L));

        Payment recentPayment = new Payment(
                UUID.randomUUID(),
                PaymentScope.ECOSYSTEM,
                recentPaidOrder.getId(),
                "mp",
                "eco-payment-" + UUID.randomUUID(),
                PaymentStatus.PENDING,
                new BigDecimal("240.00"),
                "ARS"
        );
        recentPayment.markConfirmed();
        paymentRepository.save(recentPayment);
        setPaymentConfirmedAt(recentPayment.getId(), now.minusSeconds(2 * 24L * 60L * 60L));

        EcosystemFulfillment recentFulfillment = ecosystemFulfillmentRepository.save(new EcosystemFulfillment(
                UUID.randomUUID(),
                recentPaidOrder.getId(),
                ecosystem.getId(),
                "DELIVERY",
                FulfillmentStatus.DISPATCHED
        ));
        EcosystemFulfillment oldFulfillment = ecosystemFulfillmentRepository.save(new EcosystemFulfillment(
                UUID.randomUUID(),
                olderOrder.getId(),
                ecosystem.getId(),
                "DELIVERY",
                FulfillmentStatus.CANCELLED
        ));
        setFulfillmentCreatedAt(recentFulfillment.getId(), now.minusSeconds(24L * 60L * 60L));
        setFulfillmentCreatedAt(oldFulfillment.getId(), now.minusSeconds(14 * 24L * 60L * 60L));

        ApiTestClient.ApiTestResponse response = api.get(
                "/api/ecosystem/admin/analytics/report?ecosystemId=" + ecosystem.getId() + "&range=7d",
                adminHeaders(adminUser)
        );

        assertThat(response.status()).isEqualTo(200);
        assertThat(response.body().get("ecosystemId")).isEqualTo(ecosystem.getId().toString());
        assertThat(response.body().get("rangeKey")).isEqualTo("7d");
        assertThat(response.body().get("timezone")).isEqualTo("America/Argentina/Buenos_Aires");

        Map<String, Object> periodMetrics = castMap(response.body().get("periodMetrics"));
        assertThat(periodMetrics).containsEntry("ordersCreated", 2);
        assertThat(periodMetrics).containsEntry("paymentsConfirmed", 1);
        assertThat(periodMetrics).containsEntry("fulfillmentsCreated", 1);
        assertThat(periodMetrics).containsEntry("confirmedSalesTotalAmount", 240.00);
        assertThat(periodMetrics).containsEntry("confirmedSalesCurrency", "ARS");

        Map<String, Object> currentSnapshot = castMap(response.body().get("currentSnapshot"));
        Map<String, Object> fulfillmentsByStatus = castMap(currentSnapshot.get("fulfillmentsByStatus"));
        assertThat(fulfillmentsByStatus).containsEntry("DISPATCHED", 2).containsEntry("CANCELLED", 2);
    }

    @Test
    void reportEnforcesAdminRole() throws Exception {
        ApiTestClient.ApiTestResponse response = api.get(
                "/api/ecosystem/admin/analytics/report?ecosystemId=" + ecosystem.getId() + "&range=today",
                adminHeaders(staffUser)
        );

        assertThat(response.status()).isEqualTo(403);
        assertThat(errorCode(response)).isEqualTo("forbidden");
    }

    private EcosystemOrder createOrder(Ecosystem ecosystem, BigDecimal totalAmount) {
        return EcosystemOrder.create(
                UUID.randomUUID(),
                ecosystem,
                "ARS",
                totalAmount,
                BigDecimal.ZERO,
                "",
                null,
                null,
                totalAmount,
                List.of(new EcosystemOrderItem(UUID.randomUUID(), UUID.randomUUID(), 1, totalAmount, totalAmount, "{\"name\":\"Producto\",\"currency\":\"ARS\"}"))
        );
    }

    private HttpHeaders adminHeaders(User user) throws Exception {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(login(user.getEmail()));
        return headers;
    }

    private String login(String email) throws Exception {
        ApiTestClient.ApiTestResponse response = api.postJson("/api/auth/login", Map.of("email", email, "password", "secret"), null);
        assertThat(response.status()).isEqualTo(200);
        return response.body().get("accessToken").toString();
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> castMap(Object value) {
        return (Map<String, Object>) value;
    }

    private String errorCode(ApiTestClient.ApiTestResponse response) {
        return castMap(response.body().get("error")).get("code").toString();
    }

    private void setOrderCreatedAt(UUID orderId, Instant createdAt) {
        jdbcTemplate.update(
                "update ecosystem_orders set created_at = ? where id = ?",
                Timestamp.from(createdAt),
                orderId
        );
    }

    private void setPaymentConfirmedAt(UUID paymentId, Instant confirmedAt) {
        jdbcTemplate.update(
                "update payments set confirmed_at = ? where id = ?",
                Timestamp.from(confirmedAt),
                paymentId
        );
    }

    private void setFulfillmentCreatedAt(UUID fulfillmentId, Instant createdAt) {
        jdbcTemplate.update(
                "update ecosystem_fulfillments set created_at = ? where id = ?",
                Timestamp.from(createdAt),
                fulfillmentId
        );
    }

    private void shiftExistingOperationalDataOutsideWindow(UUID ecosystemId, Instant createdAt) {
        jdbcTemplate.update(
                "update ecosystem_orders set created_at = ? where ecosystem_id = ?",
                Timestamp.from(createdAt),
                ecosystemId
        );
        jdbcTemplate.update(
                "update ecosystem_fulfillments set created_at = ? where ecosystem_id = ?",
                Timestamp.from(createdAt),
                ecosystemId
        );
    }
}
