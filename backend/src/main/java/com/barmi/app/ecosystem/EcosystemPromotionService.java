package com.barmi.app.ecosystem;

import com.barmi.domain.ecosystem.Ecosystem;
import com.barmi.domain.ecosystem.EcosystemPromotion;
import com.barmi.domain.ecosystem.EcosystemPromotionType;
import com.barmi.domain.orders.EcosystemOrder;
import com.barmi.infra.repo.EcosystemPromotionRepository;
import com.barmi.infra.repo.EcosystemRepository;
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
public class EcosystemPromotionService {

    private final EcosystemRepository ecosystemRepository;
    private final EcosystemPromotionRepository ecosystemPromotionRepository;

    public EcosystemPromotionService(
            EcosystemRepository ecosystemRepository,
            EcosystemPromotionRepository ecosystemPromotionRepository
    ) {
        this.ecosystemRepository = ecosystemRepository;
        this.ecosystemPromotionRepository = ecosystemPromotionRepository;
    }

    @Transactional(readOnly = true)
    public List<EcosystemPromotion> list(UUID ecosystemId) {
        Ecosystem ecosystem = resolveActiveEcosystem(ecosystemId);
        return ecosystemPromotionRepository.findByEcosystemIdOrderByCreatedAtDesc(ecosystem.getId());
    }

    @Transactional
    public EcosystemPromotion create(
            UUID ecosystemId,
            String code,
            EcosystemPromotionType type,
            BigDecimal value,
            Boolean active,
            Instant expirationDate,
            Long usageLimit
    ) {
        Ecosystem ecosystem = resolveActiveEcosystem(ecosystemId);
        String normalizedCode = normalizeCode(code);
        EcosystemPromotionType normalizedType = requireType(type);
        BigDecimal normalizedValue = normalizeValue(normalizedType, value);
        boolean normalizedActive = active == null || active;
        Long normalizedUsageLimit = normalizeUsageLimit(usageLimit);

        if (ecosystemPromotionRepository.existsByEcosystemIdAndCode(ecosystem.getId(), normalizedCode)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "promotion_code_conflict");
        }

        EcosystemPromotion promotion = new EcosystemPromotion(
                UUID.randomUUID(),
                ecosystem.getId(),
                normalizedCode,
                normalizedType,
                normalizedValue,
                normalizedActive,
                expirationDate,
                normalizedUsageLimit
        );
        return ecosystemPromotionRepository.save(promotion);
    }

    @Transactional
    public EcosystemPromotion updateActive(UUID ecosystemId, UUID promotionId, boolean active) {
        if (promotionId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "promotion_id_required");
        }
        Ecosystem ecosystem = resolveActiveEcosystem(ecosystemId);
        EcosystemPromotion promotion = ecosystemPromotionRepository.findByIdAndEcosystemId(promotionId, ecosystem.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "promotion_not_found"));
        promotion.setActive(active);
        return ecosystemPromotionRepository.save(promotion);
    }

    @Transactional(readOnly = true)
    public PromotionApplication preview(UUID ecosystemId, String couponCode, BigDecimal originalAmount) {
        return resolvePromotionApplication(ecosystemId, couponCode, originalAmount, false);
    }

    @Transactional
    public boolean consumeAppliedPromotion(EcosystemOrder order) {
        if (order == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "order_required");
        }
        if (!order.hasAppliedPromotion() || order.isPromotionConsumed()) {
            return false;
        }

        EcosystemPromotion promotion = ecosystemPromotionRepository.findByIdForUpdate(order.getAppliedPromotionId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "promotion_not_found"));
        promotion.incrementUsage();
        order.markPromotionConsumed();
        ecosystemPromotionRepository.save(promotion);
        return true;
    }

    private PromotionApplication resolvePromotionApplication(UUID ecosystemId, String couponCode, BigDecimal originalAmount, boolean lockForUpdate) {
        if (couponCode == null || couponCode.isBlank()) {
            return PromotionApplication.none(originalAmount);
        }
        Ecosystem ecosystem = resolveActiveEcosystem(ecosystemId);
        if (originalAmount == null || originalAmount.compareTo(BigDecimal.ZERO) < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid_original_amount");
        }

        String normalizedCode = normalizeCode(couponCode);
        EcosystemPromotion promotion = lockForUpdate
                ? ecosystemPromotionRepository.findByEcosystemIdAndCodeForUpdate(ecosystem.getId(), normalizedCode)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "coupon_not_found"))
                : ecosystemPromotionRepository.findByEcosystemIdAndCode(ecosystem.getId(), normalizedCode)
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

    private void validatePromotionState(EcosystemPromotion promotion, Instant now) {
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

    private BigDecimal calculateDiscount(EcosystemPromotion promotion, BigDecimal originalAmount) {
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

    private Ecosystem resolveActiveEcosystem(UUID ecosystemId) {
        if (ecosystemId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "ecosystem_id_required");
        }

        Ecosystem ecosystem = ecosystemRepository.findById(ecosystemId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "ecosystem_not_found"));

        if (!ecosystem.isActive()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "ecosystem_inactive");
        }
        return ecosystem;
    }

    private String normalizeCode(String code) {
        if (code == null || code.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid_coupon_code");
        }
        return code.trim().toUpperCase();
    }

    private EcosystemPromotionType requireType(EcosystemPromotionType type) {
        if (type == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid_promotion_type");
        }
        return type;
    }

    private BigDecimal normalizeValue(EcosystemPromotionType type, BigDecimal value) {
        if (value == null || value.compareTo(BigDecimal.ZERO) <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid_promotion_value");
        }
        BigDecimal normalized = value.setScale(2, RoundingMode.HALF_UP);
        if (type == EcosystemPromotionType.PERCENTAGE && normalized.compareTo(BigDecimal.valueOf(100)) > 0) {
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
            EcosystemPromotionType type,
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
