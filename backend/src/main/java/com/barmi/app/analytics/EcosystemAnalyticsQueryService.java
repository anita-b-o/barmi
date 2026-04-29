package com.barmi.app.analytics;

import com.barmi.app.security.EcosystemAuthorizationService;
import com.barmi.domain.ecosystem.Ecosystem;
import com.barmi.domain.enums.PaymentScope;
import com.barmi.domain.fulfillment.FulfillmentStatus;
import com.barmi.domain.orders.EcosystemOrderStatus;
import com.barmi.domain.payments.PaymentStatus;
import com.barmi.infra.repo.EcosystemExternalProductRepository;
import com.barmi.infra.repo.EcosystemFulfillmentRepository;
import com.barmi.infra.repo.EcosystemOrderRepository;
import com.barmi.infra.repo.EcosystemRepository;
import com.barmi.infra.repo.PaymentRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class EcosystemAnalyticsQueryService {
    private static final ZoneId REPORTING_ZONE = ZoneId.of("America/Argentina/Buenos_Aires");

    private final EcosystemAuthorizationService ecosystemAuthorizationService;
    private final EcosystemRepository ecosystemRepository;
    private final EcosystemOrderRepository ecosystemOrderRepository;
    private final EcosystemFulfillmentRepository ecosystemFulfillmentRepository;
    private final EcosystemExternalProductRepository ecosystemExternalProductRepository;
    private final PaymentRepository paymentRepository;

    public EcosystemAnalyticsQueryService(
            EcosystemAuthorizationService ecosystemAuthorizationService,
            EcosystemRepository ecosystemRepository,
            EcosystemOrderRepository ecosystemOrderRepository,
            EcosystemFulfillmentRepository ecosystemFulfillmentRepository,
            EcosystemExternalProductRepository ecosystemExternalProductRepository,
            PaymentRepository paymentRepository
    ) {
        this.ecosystemAuthorizationService = ecosystemAuthorizationService;
        this.ecosystemRepository = ecosystemRepository;
        this.ecosystemOrderRepository = ecosystemOrderRepository;
        this.ecosystemFulfillmentRepository = ecosystemFulfillmentRepository;
        this.ecosystemExternalProductRepository = ecosystemExternalProductRepository;
        this.paymentRepository = paymentRepository;
    }

    public EcosystemAnalyticsSummaryDto summary(UUID ecosystemId) {
        ecosystemAuthorizationService.requireAdmin(ecosystemId);
        Ecosystem ecosystem = ecosystemRepository.findById(ecosystemId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "ecosystem_not_found"));

        Map<String, Long> ordersByStatus = new LinkedHashMap<>();
        for (EcosystemOrderStatus status : EcosystemOrderStatus.values()) {
            ordersByStatus.put(status.name(), ecosystemOrderRepository.countByEcosystem_IdAndStatus(ecosystemId, status));
        }

        Map<String, Long> fulfillmentsByStatus = new LinkedHashMap<>();
        for (FulfillmentStatus status : FulfillmentStatus.values()) {
            fulfillmentsByStatus.put(status.name(), ecosystemFulfillmentRepository.countByEcosystemIdAndStatus(ecosystemId, status));
        }

        BigDecimal confirmedSalesTotalAmount = ecosystemOrderRepository.sumTotalAmountByEcosystemIdAndStatus(ecosystemId, EcosystemOrderStatus.PAID);
        List<String> paidCurrencies = ecosystemOrderRepository.findDistinctCurrenciesByEcosystemIdAndStatus(ecosystemId, EcosystemOrderStatus.PAID);
        String confirmedSalesCurrency = paidCurrencies.size() == 1 ? paidCurrencies.get(0) : null;

        return new EcosystemAnalyticsSummaryDto(
                ecosystem.getId(),
                ecosystem.getSlug(),
                ecosystemOrderRepository.countByEcosystem_Id(ecosystemId),
                ordersByStatus,
                confirmedSalesTotalAmount,
                confirmedSalesCurrency,
                fulfillmentsByStatus,
                ecosystemExternalProductRepository.countByEcosystem_IdAndActiveTrue(ecosystemId),
                ecosystemExternalProductRepository.countByEcosystem_IdAndActiveFalse(ecosystemId)
        );
    }

    public EcosystemOperationalReportDto report(UUID ecosystemId, String rangeKey) {
        ecosystemAuthorizationService.requireAdmin(ecosystemId);
        Ecosystem ecosystem = ecosystemRepository.findById(ecosystemId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "ecosystem_not_found"));

        ReportingRange range = ReportingRange.fromKey(rangeKey);
        Instant now = Instant.now();
        RangeWindow window = range.toWindow(now);

        long ordersCreated = ecosystemOrderRepository.countByEcosystem_IdAndCreatedAtGreaterThanEqualAndCreatedAtLessThan(
                ecosystemId,
                window.fromInclusive(),
                window.toExclusive()
        );
        long paymentsConfirmed = paymentRepository.countConfirmedEcosystemPaymentsInRange(
                PaymentScope.ECOSYSTEM,
                PaymentStatus.CONFIRMED,
                ecosystemId,
                window.fromInclusive(),
                window.toExclusive()
        );
        BigDecimal confirmedSalesTotalAmount = paymentRepository.sumConfirmedEcosystemPaymentsAmountInRange(
                PaymentScope.ECOSYSTEM,
                PaymentStatus.CONFIRMED,
                ecosystemId,
                window.fromInclusive(),
                window.toExclusive()
        );
        List<String> confirmedCurrencies = paymentRepository.findDistinctConfirmedEcosystemPaymentCurrenciesInRange(
                PaymentScope.ECOSYSTEM,
                PaymentStatus.CONFIRMED,
                ecosystemId,
                window.fromInclusive(),
                window.toExclusive()
        );
        String confirmedSalesCurrency = confirmedCurrencies.size() == 1 ? confirmedCurrencies.get(0) : null;
        long fulfillmentsCreated = ecosystemFulfillmentRepository.countByEcosystemIdAndCreatedAtGreaterThanEqualAndCreatedAtLessThan(
                ecosystemId,
                window.fromInclusive(),
                window.toExclusive()
        );

        Map<String, Long> currentFulfillmentsByStatus = new LinkedHashMap<>();
        for (FulfillmentStatus status : FulfillmentStatus.values()) {
            currentFulfillmentsByStatus.put(status.name(), ecosystemFulfillmentRepository.countByEcosystemIdAndStatus(ecosystemId, status));
        }

        return new EcosystemOperationalReportDto(
                ecosystem.getId(),
                ecosystem.getSlug(),
                range.key,
                range.label,
                window.fromInclusive(),
                window.toExclusive(),
                REPORTING_ZONE.getId(),
                new EcosystemPeriodMetricsDto(
                        ordersCreated,
                        paymentsConfirmed,
                        fulfillmentsCreated,
                        confirmedSalesTotalAmount,
                        confirmedSalesCurrency
                ),
                new EcosystemCurrentSnapshotDto(currentFulfillmentsByStatus)
        );
    }

    private enum ReportingRange {
        TODAY("today", "Hoy"),
        LAST_7_DAYS("7d", "Ultimos 7 dias"),
        LAST_30_DAYS("30d", "Ultimos 30 dias");

        private final String key;
        private final String label;

        ReportingRange(String key, String label) {
            this.key = key;
            this.label = label;
        }

        static ReportingRange fromKey(String key) {
            if (key == null || key.isBlank()) {
                return LAST_7_DAYS;
            }
            return switch (key.trim()) {
                case "today" -> TODAY;
                case "7d" -> LAST_7_DAYS;
                case "30d" -> LAST_30_DAYS;
                default -> LAST_7_DAYS;
            };
        }

        RangeWindow toWindow(Instant now) {
            if (this == TODAY) {
                LocalDate today = now.atZone(REPORTING_ZONE).toLocalDate();
                Instant from = today.atStartOfDay(REPORTING_ZONE).toInstant();
                return new RangeWindow(from, now);
            }

            long days = this == LAST_30_DAYS ? 30 : 7;
            return new RangeWindow(now.minusSeconds(days * 24L * 60L * 60L), now);
        }
    }

    private record RangeWindow(Instant fromInclusive, Instant toExclusive) {}

    public record EcosystemAnalyticsSummaryDto(
            UUID ecosystemId,
            String ecosystemSlug,
            long totalOrders,
            Map<String, Long> ordersByStatus,
            BigDecimal confirmedSalesTotalAmount,
            String confirmedSalesCurrency,
            Map<String, Long> fulfillmentsByStatus,
            long activeExternalProducts,
            long inactiveExternalProducts
    ) {}

    public record EcosystemOperationalReportDto(
            UUID ecosystemId,
            String ecosystemSlug,
            String rangeKey,
            String rangeLabel,
            Instant from,
            Instant to,
            String timezone,
            EcosystemPeriodMetricsDto periodMetrics,
            EcosystemCurrentSnapshotDto currentSnapshot
    ) {}

    public record EcosystemPeriodMetricsDto(
            long ordersCreated,
            long paymentsConfirmed,
            long fulfillmentsCreated,
            BigDecimal confirmedSalesTotalAmount,
            String confirmedSalesCurrency
    ) {}

    public record EcosystemCurrentSnapshotDto(
            Map<String, Long> fulfillmentsByStatus
    ) {}
}
