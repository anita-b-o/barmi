package com.barmi.app.analytics;

import com.barmi.app.security.StoreAuthorizationService;
import com.barmi.domain.enums.PaymentScope;
import com.barmi.domain.fulfillment.FulfillmentStatus;
import com.barmi.domain.orders.StoreOrderStatus;
import com.barmi.domain.payments.PaymentStatus;
import com.barmi.domain.store.Store;
import com.barmi.infra.repo.OutboxEventRepository;
import com.barmi.infra.repo.PaymentRepository;
import com.barmi.infra.repo.ProductRepository;
import com.barmi.infra.repo.StoreFulfillmentRepository;
import com.barmi.infra.repo.StoreOrderRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class StoreAnalyticsQueryService {
    private static final String STOCK_CONFLICT_EVENT_TYPE = "STORE_ORDER_STOCK_CONFLICT";
    private static final String ORDER_CANCELLED_EVENT_TYPE = "STORE_ORDER_MANUALLY_CANCELLED";
    private static final ZoneId REPORTING_ZONE = ZoneId.of("America/Argentina/Buenos_Aires");

    private final StoreAuthorizationService storeAuthorizationService;
    private final StoreOrderRepository storeOrderRepository;
    private final StoreFulfillmentRepository storeFulfillmentRepository;
    private final ProductRepository productRepository;
    private final PaymentRepository paymentRepository;
    private final OutboxEventRepository outboxEventRepository;

    public StoreAnalyticsQueryService(
            StoreAuthorizationService storeAuthorizationService,
            StoreOrderRepository storeOrderRepository,
            StoreFulfillmentRepository storeFulfillmentRepository,
            ProductRepository productRepository,
            PaymentRepository paymentRepository,
            OutboxEventRepository outboxEventRepository
    ) {
        this.storeAuthorizationService = storeAuthorizationService;
        this.storeOrderRepository = storeOrderRepository;
        this.storeFulfillmentRepository = storeFulfillmentRepository;
        this.productRepository = productRepository;
        this.paymentRepository = paymentRepository;
        this.outboxEventRepository = outboxEventRepository;
    }

    public StoreAnalyticsSummaryDto summary() {
        Store store = storeAuthorizationService.requireCurrentStore();
        UUID storeId = store.getId();

        Map<String, Long> ordersByStatus = new LinkedHashMap<>();
        for (StoreOrderStatus status : StoreOrderStatus.values()) {
            ordersByStatus.put(status.name(), storeOrderRepository.countByStoreIdAndStatus(storeId, status));
        }

        Map<String, Long> fulfillmentsByStatus = new LinkedHashMap<>();
        for (FulfillmentStatus status : FulfillmentStatus.values()) {
            fulfillmentsByStatus.put(status.name(), storeFulfillmentRepository.countByStoreIdAndStatus(storeId, status));
        }

        BigDecimal confirmedSalesTotalAmount = storeOrderRepository.sumTotalAmountByStoreIdAndStatus(storeId, StoreOrderStatus.PAID);
        List<String> paidCurrencies = storeOrderRepository.findDistinctCurrenciesByStoreIdAndStatus(storeId, StoreOrderStatus.PAID);
        String confirmedSalesCurrency = paidCurrencies.size() == 1 ? paidCurrencies.get(0) : null;

        return new StoreAnalyticsSummaryDto(
                storeId,
                store.getSlug(),
                storeOrderRepository.countByStoreId(storeId),
                ordersByStatus,
                confirmedSalesTotalAmount,
                confirmedSalesCurrency,
                fulfillmentsByStatus,
                productRepository.countByStoreIdAndActiveTrue(storeId),
                productRepository.countByStoreIdAndActiveFalse(storeId)
        );
    }

    public StoreOperationalReportDto report(String rangeKey) {
        Store store = storeAuthorizationService.requireCurrentStore();
        UUID storeId = store.getId();
        ReportingRange range = ReportingRange.fromKey(rangeKey);
        Instant now = Instant.now();
        RangeWindow window = range.toWindow(now);

        long ordersCreated = storeOrderRepository.countByStoreIdAndCreatedAtGreaterThanEqualAndCreatedAtLessThan(
                storeId,
                window.fromInclusive(),
                window.toExclusive()
        );
        long paymentsConfirmed = paymentRepository.countConfirmedStorePaymentsInRange(
                PaymentScope.STORE,
                PaymentStatus.CONFIRMED,
                storeId,
                window.fromInclusive(),
                window.toExclusive()
        );
        BigDecimal confirmedSalesTotalAmount = paymentRepository.sumConfirmedStorePaymentsAmountInRange(
                PaymentScope.STORE,
                PaymentStatus.CONFIRMED,
                storeId,
                window.fromInclusive(),
                window.toExclusive()
        );
        List<String> confirmedCurrencies = paymentRepository.findDistinctConfirmedStorePaymentCurrenciesInRange(
                PaymentScope.STORE,
                PaymentStatus.CONFIRMED,
                storeId,
                window.fromInclusive(),
                window.toExclusive()
        );
        String confirmedSalesCurrency = confirmedCurrencies.size() == 1 ? confirmedCurrencies.get(0) : null;

        long manualCancellations = outboxEventRepository.countDistinctStoreOrderEventsInRange(
                PaymentScope.STORE.name(),
                ORDER_CANCELLED_EVENT_TYPE,
                storeId,
                window.fromInclusive(),
                window.toExclusive()
        );
        long stockConflicts = outboxEventRepository.countDistinctStoreOrderEventsInRange(
                PaymentScope.STORE.name(),
                STOCK_CONFLICT_EVENT_TYPE,
                storeId,
                window.fromInclusive(),
                window.toExclusive()
        );
        long fulfillmentsCreated = storeFulfillmentRepository.countByStoreIdAndCreatedAtGreaterThanEqualAndCreatedAtLessThan(
                storeId,
                window.fromInclusive(),
                window.toExclusive()
        );

        Map<String, Long> currentFulfillmentsByStatus = new LinkedHashMap<>();
        for (FulfillmentStatus status : FulfillmentStatus.values()) {
            currentFulfillmentsByStatus.put(status.name(), storeFulfillmentRepository.countByStoreIdAndStatus(storeId, status));
        }

        return new StoreOperationalReportDto(
                storeId,
                store.getSlug(),
                range.key,
                range.label,
                window.fromInclusive(),
                window.toExclusive(),
                REPORTING_ZONE.getId(),
                new PeriodMetricsDto(
                        ordersCreated,
                        paymentsConfirmed,
                        manualCancellations,
                        stockConflicts,
                        fulfillmentsCreated,
                        confirmedSalesTotalAmount,
                        confirmedSalesCurrency
                ),
                new CurrentSnapshotDto(currentFulfillmentsByStatus)
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

    public record StoreAnalyticsSummaryDto(
            UUID storeId,
            String storeSlug,
            long totalOrders,
            Map<String, Long> ordersByStatus,
            BigDecimal confirmedSalesTotalAmount,
            String confirmedSalesCurrency,
            Map<String, Long> fulfillmentsByStatus,
            long activeProducts,
            long inactiveProducts
    ) {}

    public record StoreOperationalReportDto(
            UUID storeId,
            String storeSlug,
            String rangeKey,
            String rangeLabel,
            Instant from,
            Instant to,
            String timezone,
            PeriodMetricsDto periodMetrics,
            CurrentSnapshotDto currentSnapshot
    ) {}

    public record PeriodMetricsDto(
            long ordersCreated,
            long paymentsConfirmed,
            long ordersPaid,
            long manualCancellations,
            long stockConflicts,
            long fulfillmentsCreated,
            BigDecimal confirmedSalesTotalAmount,
            String confirmedSalesCurrency
    ) {
        public PeriodMetricsDto(
                long ordersCreated,
                long paymentsConfirmed,
                long manualCancellations,
                long stockConflicts,
                long fulfillmentsCreated,
                BigDecimal confirmedSalesTotalAmount,
                String confirmedSalesCurrency
        ) {
            this(
                    ordersCreated,
                    paymentsConfirmed,
                    paymentsConfirmed,
                    manualCancellations,
                    stockConflicts,
                    fulfillmentsCreated,
                    confirmedSalesTotalAmount,
                    confirmedSalesCurrency
            );
        }
    }

    public record CurrentSnapshotDto(
            Map<String, Long> fulfillmentsByStatus
    ) {}
}
