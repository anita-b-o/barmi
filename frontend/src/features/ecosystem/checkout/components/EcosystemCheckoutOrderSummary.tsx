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

  return (
    <Card
      style={{
        position: isDesktop ? 'sticky' : 'static',
        top: isDesktop ? theme.spacing.xl : undefined,
        alignSelf: 'start',
        maxWidth: '100%',
        display: 'grid',
        gap: theme.spacing.lg,
        padding: viewportMode === 'mobile' ? theme.spacing.lg : theme.spacing.xl,
        borderColor: theme.colors.borderDefault
      }}
    >
      <div
        style={{
          display: 'grid',
          gap: theme.spacing.xs
        }}
      >
        <div style={{ fontWeight: 700, fontSize: theme.typography.title.size, color: theme.colors.secondary }}>Resumen</div>
        <div style={{ color: theme.colors.textMuted, lineHeight: 1.5 }}>
          {preview.items.length} productos • {preview.canQuoteShipping ? 'con envío' : 'sin envío'}
        </div>
      </div>

      {promotions.length > 0 ? (
        <div
          style={{
            display: 'grid',
            gap: theme.spacing.sm,
            padding: theme.spacing.lg,
            borderRadius: theme.radius.lg,
            background: theme.colors.bgSurfaceAlt,
            border: `1px solid ${theme.colors.borderDefault}`
          }}
        >
        <div style={{ fontWeight: 700, color: theme.colors.textPrimary }}>Promociones activas</div>
          <div style={{ color: theme.colors.textMuted, lineHeight: 1.5 }}>
            Usá uno de estos códigos si corresponde.
          </div>
          <div style={{ display: 'grid', gap: theme.spacing.sm }}>
            {promotions.map((promotion) => (
              <div
                key={promotion.code}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: theme.spacing.md,
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  padding: theme.spacing.md,
                  borderRadius: theme.radius.md,
                  background: theme.colors.bgSurfaceAlt,
                  border: `1px solid ${theme.colors.borderDefault}`
                }}
              >
                <div style={{ display: 'grid', gap: 4 }}>
                  <div style={{ fontWeight: 700 }}>{promotion.shortLabel}</div>
                  <div style={{ color: theme.colors.textMuted }}>
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
        style={{
          display: 'grid',
          gap: theme.spacing.md,
          padding: theme.spacing.lg,
          borderRadius: theme.radius.lg,
          background: theme.colors.bgSurfaceAlt,
          border: `1px solid ${theme.colors.borderDefault}`
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: theme.spacing.md, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ fontWeight: 700, color: theme.colors.textPrimary }}>Cupón</div>
          {couponFeedback.status === 'valid' ? <Badge variant="success">Aplicado</Badge> : null}
          {couponFeedback.status === 'invalid' ? <Badge variant="error">No válido</Badge> : null}
        </div>
        <div style={{ display: 'flex', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
          <Input
            value={couponCode}
            onChange={(event) => onCouponCodeChange(event.target.value)}
            placeholder="BIENVENIDA10"
            aria-label="Cupón ecosystem"
            style={{ minWidth: 0, flex: '1 1 180px', background: theme.colors.bgSurfaceAlt }}
          />
          <Button type="button" variant="secondary" onClick={onApplyCoupon} disabled={isCouponLoading}>
            {isCouponLoading ? 'Validando...' : 'Aplicar'}
          </Button>
        </div>
        {isCouponLoading ? <LoadingBlock label="Recalculando total con el cupón..." /> : null}
          {couponFeedback.message ? (
          <div
            style={{
              color: couponFeedback.status === 'invalid' ? theme.colors.error : theme.colors.success,
              padding: theme.spacing.md,
              borderRadius: theme.radius.lg,
              background: alpha(couponFeedback.status === 'invalid' ? theme.colors.error : theme.colors.success, 0.1),
              border: `1px solid ${alpha(couponFeedback.status === 'invalid' ? theme.colors.error : theme.colors.success, 0.2)}`,
              boxShadow: 'none'
            }}
          >
            {couponFeedback.message}
          </div>
        ) : (
          <div style={{ color: theme.colors.textMuted }}>
            Si no usás cupón, podés continuar con el total calculado hasta ahora.
          </div>
        )}
      </div>

      <div
        style={{
          display: 'grid',
          gap: theme.spacing.sm,
          padding: theme.spacing.xl,
          borderRadius: theme.radius.lg,
          background: theme.colors.bgSurfaceAlt,
          border: `1px solid ${theme.colors.borderDefault}`
        }}
      >
        <div style={{ display: 'grid', gap: theme.spacing.md }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: theme.spacing.md, flexWrap: 'wrap' }}>
            <span style={{ color: theme.colors.textMuted, minWidth: 0 }}>Subtotal</span>
            <strong style={{ minWidth: 0, marginLeft: 'auto', textAlign: 'right' }}>{formatMoney(preview.subtotalAmount, preview.currency)}</strong>
          </div>
          {preview.shippingCostAmount > 0 || preview.canQuoteShipping ? (
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: theme.spacing.md, flexWrap: 'wrap' }}>
              <span style={{ color: theme.colors.textMuted, minWidth: 0 }}>Envío</span>
              <strong style={{ minWidth: 0, marginLeft: 'auto', textAlign: 'right' }}>
                {requiresShippingQuote
                  ? shippingAvailable
                    ? formatMoney(preview.shippingCostAmount, preview.currency)
                    : 'Pendiente de cotización'
                  : formatMoney(preview.shippingCostAmount, preview.currency)}
              </strong>
            </div>
          ) : null}
          {preview.discountAmount > 0 ? (
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: theme.spacing.md, flexWrap: 'wrap' }}>
              <span style={{ color: theme.colors.textMuted, minWidth: 0, overflowWrap: 'anywhere' }}>
                {preview.appliedCouponCode ? `Descuento (${preview.appliedCouponCode})` : 'Descuento'}
              </span>
              <strong style={{ color: theme.colors.success, minWidth: 0, marginLeft: 'auto', textAlign: 'right' }}>
                -{formatMoney(preview.discountAmount, preview.currency)}
              </strong>
            </div>
          ) : null}
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: theme.spacing.md,
            alignItems: 'center',
            flexWrap: 'wrap',
            paddingTop: theme.spacing.md,
            borderTop: `1px solid ${theme.colors.borderDefault}`
          }}
        >
          <div style={{ display: 'grid', gap: 4 }}>
            <span style={{ color: theme.colors.textMuted }}>Total final</span>
          </div>
          <strong style={{ fontSize: viewportMode === 'mobile' ? 38 : 44, lineHeight: 1, color: theme.colors.text, minWidth: 0, overflowWrap: 'anywhere', textAlign: 'right', marginLeft: 'auto', letterSpacing: 0 }}>
            {formatMoney(preview.totalAmount, preview.currency)}
          </strong>
        </div>
      </div>

      {isQuoteLoading ? <LoadingBlock label="Actualizando cotización de envío..." /> : null}

      <div
        style={{
          padding: theme.spacing.md,
          borderRadius: theme.radius.lg,
          background: disabledReason ? alpha(theme.colors.warning, 0.1) : theme.colors.bgSurfaceAlt,
          border: `1px solid ${disabledReason ? alpha(theme.colors.warning, 0.2) : theme.colors.borderDefault}`,
          color: disabledReason ? theme.colors.warning : theme.colors.textMuted
        }}
      >
        {disabledReason ?? 'Después de crear la orden vas a poder continuar al pago y seguirla desde el detalle público del ecosystem.'}
      </div>

      {showPrimaryAction ? (
        <>
          <Button onClick={onSubmit} disabled={isSubmitting || isCouponLoading || isQuoteLoading || !canSubmit} aria-busy={isSubmitting} style={{ width: '100%', minHeight: 52 }}>
            {isSubmitting ? 'Creando orden...' : 'Crear orden y continuar'}
          </Button>
          <div style={{ display: 'grid', gap: 6, color: theme.colors.textMuted, fontSize: theme.typography.small.size }}>
            <div>• Sin cargos ocultos</div>
            <div>• Confirmación inmediata</div>
            <div>• Pago seguro</div>
          </div>
        </>
      ) : null}
    </Card>
  )
}
