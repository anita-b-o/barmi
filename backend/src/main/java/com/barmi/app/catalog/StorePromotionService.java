package com.barmi.app.catalog;

import com.barmi.app.tenant.TenantContext;
import com.barmi.domain.catalog.StorePromotion;
import com.barmi.domain.catalog.StorePromotionType;
import com.barmi.domain.orders.StoreOrder;
import com.barmi.domain.store.Store;
import com.barmi.infra.repo.StorePromotionRepository;
import com.barmi.infra.repo.StoreRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class StorePromotionService {

    private final StoreRepository storeRepository;
    private final StorePromotionRepository storePromotionRepository;

    public StorePromotionService(
            StoreRepository storeRepository,
            StorePromotionRepository storePromotionRepository
    ) {
        this.storeRepository = storeRepository;
        this.storePromotionRepository = storePromotionRepository;
    }

    @Transactional(readOnly = true)
    public List<StorePromotion> list() {
        Store store = resolveStore();
        return storePromotionRepository.findByStoreIdOrderByCreatedAtDesc(store.getId());
    }

    @Transactional
    public StorePromotion create(String code, StorePromotionType type, BigDecimal value, Boolean active, Instant expirationDate, Long usageLimit) {
        Store store = resolveStore();
        String normalizedCode = normalizeCode(code);
        StorePromotionType normalizedType = requireType(type);
        BigDecimal normalizedValue = normalizeValue(normalizedType, value);
        boolean normalizedActive = active == null || active;
        Long normalizedUsageLimit = normalizeUsageLimit(usageLimit);

        if (storePromotionRepository.existsByStoreIdAndCode(store.getId(), normalizedCode)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "promotion_code_conflict");
        }

        StorePromotion promotion = new StorePromotion(
                UUID.randomUUID(),
                store.getId(),
                normalizedCode,
                normalizedType,
                normalizedValue,
                normalizedActive,
                expirationDate,
                normalizedUsageLimit
        );
        return storePromotionRepository.save(promotion);
    }

    @Transactional
    public StorePromotion updateActive(UUID promotionId, boolean active) {
        if (promotionId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "promotion_id_required");
        }
        Store store = resolveStore();
        StorePromotion promotion = storePromotionRepository.findByIdAndStoreId(promotionId, store.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "promotion_not_found"));
        promotion.setActive(active);
        return storePromotionRepository.save(promotion);
    }

    @Transactional(readOnly = true)
    public PromotionApplication preview(UUID storeId, String couponCode, BigDecimal originalAmount) {
        return resolvePromotionApplication(storeId, couponCode, originalAmount, false);
    }

    @Transactional
    public boolean consumeAppliedPromotion(StoreOrder order) {
        if (order == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "order_required");
        }
        if (!order.hasAppliedPromotion() || order.isPromotionConsumed()) {
            return false;
        }

        StorePromotion promotion = storePromotionRepository.findByIdForUpdate(order.getAppliedPromotionId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "promotion_not_found"));
        promotion.incrementUsage();
        order.markPromotionConsumed();
        storePromotionRepository.save(promotion);
        return true;
    }

    private PromotionApplication resolvePromotionApplication(UUID storeId, String couponCode, BigDecimal originalAmount, boolean lockForUpdate) {
        if (couponCode == null || couponCode.isBlank()) {
            return PromotionApplication.none(originalAmount);
        }
        if (storeId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "store_required");
        }
        if (originalAmount == null || originalAmount.compareTo(BigDecimal.ZERO) < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid_original_amount");
        }

        String normalizedCode = normalizeCode(couponCode);
        StorePromotion promotion = lockForUpdate
                ? storePromotionRepository.findByStoreIdAndCodeForUpdate(storeId, normalizedCode)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "coupon_not_found"))
                : storePromotionRepository.findByStoreIdOrderByCreatedAtDesc(storeId).stream()
                    .filter(item -> item.getCode().equals(normalizedCode))
                    .findFirst()
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "coupon_not_found"));

        validatePromotionState(promotion, Instant.now());

        BigDecimal discountAmount = calculateDiscount(promotion, originalAmount);

        return new PromotionApplication(
                promotion.getId(),
                promotion.getCode(),
                promotion.getType(),
                originalAmount,
                discountAmount,
                originalAmount.subtract(discountAmount)
        );
    }

    private void validatePromotionState(StorePromotion promotion, Instant now) {
        if (!promotion.isActive()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "coupon_inactive");
        }
        if (promotion.getExpirationDate() != null && !promotion.getExpirationDate().isAfter(now)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "coupon_expired");
        }
        if (promotion.getUsageLimit() != null && promotion.getUsageCount() >= promotion.getUsageLimit()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "coupon_usage_limit_reached");
        }
    }

    private BigDecimal calculateDiscount(StorePromotion promotion, BigDecimal originalAmount) {
        BigDecimal discountAmount = switch (promotion.getType()) {
            case FIXED -> promotion.getValueAmount();
            case PERCENTAGE -> originalAmount
                    .multiply(promotion.getValueAmount())
                    .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        };

        if (discountAmount.compareTo(originalAmount) > 0) {
            return originalAmount;
        }
        return discountAmount.setScale(2, RoundingMode.HALF_UP);
    }

    private Store resolveStore() {
        String storeSlug = TenantContext.getStoreSlug();
        if (storeSlug == null || storeSlug.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "store_context_required");
        }

        Store store = storeRepository.findBySlug(storeSlug)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "store_not_found"));

        if (!store.isActive()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "store_inactive");
        }

        return store;
    }

    private String normalizeCode(String code) {
        if (code == null || code.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid_coupon_code");
        }
        return code.trim().toUpperCase();
    }

    private StorePromotionType requireType(StorePromotionType type) {
        if (type == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid_promotion_type");
        }
        return type;
    }

    private BigDecimal normalizeValue(StorePromotionType type, BigDecimal value) {
        if (value == null || value.compareTo(BigDecimal.ZERO) <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid_promotion_value");
        }
        BigDecimal normalized = value.setScale(2, RoundingMode.HALF_UP);
        if (type == StorePromotionType.PERCENTAGE && normalized.compareTo(BigDecimal.valueOf(100)) > 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid_promotion_value");
        }
        return normalized;
    }

    private Long normalizeUsageLimit(Long usageLimit) {
        if (usageLimit == null) return null;
        if (usageLimit < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid_usage_limit");
        }
        return usageLimit;
    }

    public record PromotionApplication(
            UUID promotionId,
            String code,
            StorePromotionType type,
            BigDecimal originalAmount,
            BigDecimal discountAmount,
            BigDecimal finalAmount
    ) {
        static PromotionApplication none(BigDecimal originalAmount) {
            BigDecimal normalized = originalAmount == null ? BigDecimal.ZERO : originalAmount.setScale(2, RoundingMode.HALF_UP);
            return new PromotionApplication(null, null, null, normalized, BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP), normalized);
        }
    }
}
