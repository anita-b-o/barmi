import type { CSSProperties } from 'react'
import Card from '@/components/primitives/Card'
import Input from '@/components/primitives/Input'
import Button from '@/components/primitives/Button'
import Badge from '@/components/primitives/Badge'
import LoadingBlock from '@/components/feedback/LoadingState'
import { alpha, theme } from '@/app/theme'
import { useViewportMode } from '@/core/hooks/useViewportMode'
import { formatMoney } from '@/core/utils/format'
import type { EcosystemCheckoutPreview } from '../types'

type EcosystemCheckoutOrderSummaryProps = {
  preview: EcosystemCheckoutPreview
  requiresShippingQuote: boolean
  shippingAvailable: boolean
  isSubmitting: boolean
  isQuoteLoading: boolean
  couponCode: string
  couponFeedback: { status: 'idle' | 'valid' | 'invalid'; message: string | null }
  isCouponLoading: boolean
  canSubmit: boolean
  disabledReason: string | null
  promotions?: Array<{ code: string; shortLabel: string; expirationDate: string | null }>
  onCouponCodeChange: (value: string) => void
  onApplyCoupon: () => void
  onSubmit: () => void
  showPrimaryAction?: boolean
}

function formatPromotionExpiry(expirationDate: string | null) {
  if (!expirationDate) return null
  return new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium' }).format(new Date(expirationDate))
}

const orderSummaryStyles = {
  cardMobile: {
    position: 'static',
    alignSelf: 'start',
    maxWidth: '100%',
    display: 'grid',
    gap: theme.spacing.lg,
    padding: theme.spacing.lg,
    borderColor: theme.colors.borderDefault
  },
  cardDesktop: {
    position: 'sticky',
    top: theme.spacing.xl,
    alignSelf: 'start',
    maxWidth: '100%',
    display: 'grid',
    gap: theme.spacing.lg,
    padding: theme.spacing.xl,
    borderColor: theme.colors.borderDefault
  },
  header: { display: 'grid', gap: theme.spacing.xs },
  title: { fontWeight: 700, fontSize: theme.typography.title.size, color: theme.colors.textPrimary },
  mutedCopy: { color: theme.colors.textMuted, lineHeight: 1.5 },
  panel: {
    display: 'grid',
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
    borderRadius: theme.radius.lg,
    background: theme.colors.bgSurfaceAlt,
    border: `1px solid ${theme.colors.borderDefault}`
  },
  totalsPanel: {
    display: 'grid',
    gap: theme.spacing.sm,
    padding: theme.spacing.xl,
    borderRadius: theme.radius.lg,
    background: theme.colors.bgSurfaceAlt,
    border: `1px solid ${theme.colors.borderDefault}`
  },
  panelTitle: { fontWeight: 700, color: theme.colors.textPrimary },
  promoList: { display: 'grid', gap: theme.spacing.sm },
  promoItem: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
    alignItems: 'center',
    flexWrap: 'wrap',
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    background: theme.colors.bgSurfaceAlt,
    border: `1px solid ${theme.colors.borderDefault}`
  },
  compactStack: { display: 'grid', gap: 4 },
  strongText: { fontWeight: 700 },
  couponHeader: { display: 'flex', justifyContent: 'space-between', gap: theme.spacing.md, alignItems: 'center', flexWrap: 'wrap' },
  couponControls: { display: 'flex', gap: theme.spacing.sm, flexWrap: 'wrap' },
  couponInput: { minWidth: 0, flex: '1 1 180px', background: theme.colors.bgSurfaceAlt },
  totalsStack: { display: 'grid', gap: theme.spacing.md },
  totalLine: { display: 'flex', justifyContent: 'space-between', gap: theme.spacing.md, flexWrap: 'wrap' },
  totalLabel: { color: theme.colors.textMuted, minWidth: 0 },
  discountLabel: { color: theme.colors.textMuted, minWidth: 0, overflowWrap: 'anywhere' },
  totalValue: { minWidth: 0, marginLeft: 'auto', textAlign: 'right' },
  discountValue: { color: theme.colors.success, minWidth: 0, marginLeft: 'auto', textAlign: 'right' },
  finalTotalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
    alignItems: 'center',
    flexWrap: 'wrap',
    paddingTop: theme.spacing.md,
    borderTop: `1px solid ${theme.colors.borderDefault}`
  },
  finalTotalMobile: {
    fontSize: 38,
    lineHeight: 1,
    color: theme.colors.text,
    minWidth: 0,
    overflowWrap: 'anywhere',
    textAlign: 'right',
    marginLeft: 'auto',
    letterSpacing: 0
  },
  finalTotalDesktop: {
    fontSize: 44,
    lineHeight: 1,
    color: theme.colors.text,
    minWidth: 0,
    overflowWrap: 'anywhere',
    textAlign: 'right',
    marginLeft: 'auto',
    letterSpacing: 0
  },
  button: { width: '100%', minHeight: 52 },
  reassurance: { display: 'grid', gap: 6, color: theme.colors.textMuted, fontSize: theme.typography.small.size }
} satisfies Record<string, CSSProperties>

function couponFeedbackStyle(status: 'idle' | 'valid' | 'invalid'): CSSProperties {
  const color = status === 'invalid' ? theme.colors.error : theme.colors.success
  return {
    color,
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    background: alpha(color, 0.1),
    border: `1px solid ${alpha(color, 0.2)}`,
    boxShadow: 'none'
  }
}

function disabledReasonStyle(disabledReason: string | null): CSSProperties {
  return {
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    background: disabledReason ? alpha(theme.colors.warning, 0.1) : theme.colors.bgSurfaceAlt,
    border: `1px solid ${disabledReason ? alpha(theme.colors.warning, 0.2) : theme.colors.borderDefault}`,
    color: disabledReason ? theme.colors.warning : theme.colors.textMuted
  }
}

export function EcosystemCheckoutOrderSummary({
  preview,
  requiresShippingQuote,
  shippingAvailable,
  isSubmitting,
  isQuoteLoading,
  couponCode,
  couponFeedback,
  isCouponLoading,
  canSubmit,
  disabledReason,
  promotions = [],
  onCouponCodeChange,
  onApplyCoupon,
  onSubmit,
  showPrimaryAction = true
}: EcosystemCheckoutOrderSummaryProps) {
  const viewportMode = useViewportMode()
  const isDesktop = viewportMode === 'desktop'
  const isMobile = viewportMode === 'mobile'

  return (
    <Card
      style={isDesktop ? orderSummaryStyles.cardDesktop : orderSummaryStyles.cardMobile}
    >
      <div
        style={orderSummaryStyles.header}
      >
        <div style={orderSummaryStyles.title}>Resumen</div>
        <div style={orderSummaryStyles.mutedCopy}>
          {preview.items.length} productos • {preview.canQuoteShipping ? 'con envío' : 'sin envío'}
        </div>
      </div>

      {promotions.length > 0 ? (
        <div
          style={orderSummaryStyles.panel}
        >
        <div style={orderSummaryStyles.panelTitle}>Promociones activas</div>
          <div style={orderSummaryStyles.mutedCopy}>
            Usá uno de estos códigos si corresponde.
          </div>
          <div style={orderSummaryStyles.promoList}>
            {promotions.map((promotion) => (
              <div
                key={promotion.code}
                style={orderSummaryStyles.promoItem}
              >
                <div style={orderSummaryStyles.compactStack}>
                  <div style={orderSummaryStyles.strongText}>{promotion.shortLabel}</div>
                  <div style={orderSummaryStyles.mutedCopy}>
                    Código: <strong>{promotion.code}</strong>
                    {formatPromotionExpiry(promotion.expirationDate)
                      ? ` · Vence ${formatPromotionExpiry(promotion.expirationDate)}`
                      : ' · Sin vencimiento visible'}
                  </div>
                </div>
                <Badge variant="neutral">Cupón manual</Badge>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div
        style={orderSummaryStyles.panel}
      >
        <div style={orderSummaryStyles.couponHeader}>
          <div style={orderSummaryStyles.panelTitle}>Cupón</div>
          {couponFeedback.status === 'valid' ? <Badge variant="success">Aplicado</Badge> : null}
          {couponFeedback.status === 'invalid' ? <Badge variant="error">No válido</Badge> : null}
        </div>
        <div style={orderSummaryStyles.couponControls}>
          <Input
            value={couponCode}
            onChange={(event) => onCouponCodeChange(event.target.value)}
            placeholder="BIENVENIDA10"
            aria-label="Cupón ecosystem"
            style={orderSummaryStyles.couponInput}
          />
          <Button type="button" variant="secondary" onClick={onApplyCoupon} disabled={isCouponLoading}>
            {isCouponLoading ? 'Validando...' : 'Aplicar'}
          </Button>
        </div>
        {isCouponLoading ? <LoadingBlock label="Recalculando total con el cupón..." /> : null}
          {couponFeedback.message ? (
          <div
            style={couponFeedbackStyle(couponFeedback.status)}
          >
            {couponFeedback.message}
          </div>
        ) : (
          <div style={orderSummaryStyles.mutedCopy}>
            Si no usás cupón, podés continuar con el total calculado hasta ahora.
          </div>
        )}
      </div>

      <div
        style={orderSummaryStyles.totalsPanel}
      >
        <div style={orderSummaryStyles.totalsStack}>
          <div style={orderSummaryStyles.totalLine}>
            <span style={orderSummaryStyles.totalLabel}>Subtotal</span>
            <strong style={orderSummaryStyles.totalValue}>{formatMoney(preview.subtotalAmount, preview.currency)}</strong>
          </div>
          {preview.shippingCostAmount > 0 || preview.canQuoteShipping ? (
            <div style={orderSummaryStyles.totalLine}>
              <span style={orderSummaryStyles.totalLabel}>Envío</span>
              <strong style={orderSummaryStyles.totalValue}>
                {requiresShippingQuote
                  ? shippingAvailable
                    ? formatMoney(preview.shippingCostAmount, preview.currency)
                    : 'Pendiente de cotización'
                  : formatMoney(preview.shippingCostAmount, preview.currency)}
              </strong>
            </div>
          ) : null}
          {preview.discountAmount > 0 ? (
            <div style={orderSummaryStyles.totalLine}>
              <span style={orderSummaryStyles.discountLabel}>
                {preview.appliedCouponCode ? `Descuento (${preview.appliedCouponCode})` : 'Descuento'}
              </span>
              <strong style={orderSummaryStyles.discountValue}>
                -{formatMoney(preview.discountAmount, preview.currency)}
              </strong>
            </div>
          ) : null}
        </div>

        <div
          style={orderSummaryStyles.finalTotalRow}
        >
          <div style={orderSummaryStyles.compactStack}>
            <span style={orderSummaryStyles.mutedCopy}>Total final</span>
          </div>
          <strong style={isMobile ? orderSummaryStyles.finalTotalMobile : orderSummaryStyles.finalTotalDesktop}>
            {formatMoney(preview.totalAmount, preview.currency)}
          </strong>
        </div>
      </div>

      {isQuoteLoading ? <LoadingBlock label="Actualizando cotización de envío..." /> : null}

      <div
        style={disabledReasonStyle(disabledReason)}
      >
        {disabledReason ?? 'Después de crear la orden vas a poder continuar al pago y seguirla desde el detalle público del ecosystem.'}
      </div>

      {showPrimaryAction ? (
        <>
          <Button onClick={onSubmit} disabled={isSubmitting || isCouponLoading || isQuoteLoading || !canSubmit} aria-busy={isSubmitting} style={orderSummaryStyles.button}>
            {isSubmitting ? 'Creando orden...' : 'Crear orden y continuar'}
          </Button>
          <div style={orderSummaryStyles.reassurance}>
            <div>• Sin cargos ocultos</div>
            <div>• Confirmación inmediata</div>
            <div>• Pago seguro</div>
          </div>
        </>
      ) : null}
    </Card>
  )
}
