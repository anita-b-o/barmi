import type { CSSProperties } from 'react'
import Button from '@/components/primitives/Button'
import Card from '@/components/primitives/Card'
import Input from '@/components/primitives/Input'
import Badge from '@/components/primitives/Badge'
import LoadingBlock from '@/components/feedback/LoadingState'
import { alpha, theme } from '@/app/theme'
import { useViewportMode } from '@/core/hooks/useViewportMode'
import { formatMoney } from '@/core/utils/format'
import type { StoreCheckoutPreview, StoreCheckoutSuccessState, StoreCouponPreviewState } from '../types'

type StoreCheckoutOrderSummaryProps = {
  preview: StoreCheckoutPreview
  isSubmitting: boolean
  isQuoteLoading: boolean
  isCouponLoading: boolean
  canSubmit: boolean
  disabledReason: string | null
  couponCode: string
  couponPreview: StoreCouponPreviewState
  promotions?: Array<{ code: string; shortLabel: string }>
  onCouponCodeChange: (value: string) => void
  onApplyCoupon: () => void
  onSubmit: () => void
  successState: StoreCheckoutSuccessState | null
}

export function StoreCheckoutOrderSummary({
  preview,
  isSubmitting,
  isQuoteLoading,
  isCouponLoading,
  canSubmit,
  disabledReason,
  couponCode,
  couponPreview,
  promotions = [],
  onCouponCodeChange,
  onApplyCoupon,
  onSubmit,
  successState
}: StoreCheckoutOrderSummaryProps) {
  void successState
  const viewportMode = useViewportMode()
  const isDesktop = viewportMode === 'desktop'

  return (
    <Card
      style={getSummaryCardStyle(isDesktop, viewportMode === 'mobile')}
    >
      <div style={{ display: 'grid', gap: 4 }}>
        <div style={{ fontWeight: 700, fontSize: theme.typography.title.size }}>Resumen final</div>
        <div style={summaryMutedTextStyle}>
          Revisá importes, aplicá un cupón si corresponde y confirmá la orden cuando todo esté listo.
        </div>
      </div>

      {promotions.length > 0 ? (
        <div style={summaryCompactPanelStyle}>
          <div style={{ fontWeight: 700 }}>Promociones activas recordadas</div>
          <div style={summaryMutedTextStyle}>
            Si tenés un código vigente, ingresalo manualmente para recalcular el total final.
          </div>
          <div style={{ display: 'flex', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
            {promotions.map((promotion) => (
              <Badge key={promotion.code} variant="info">
                {promotion.code} · {promotion.shortLabel}
              </Badge>
            ))}
          </div>
        </div>
      ) : null}

      <div style={summaryPanelStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: theme.spacing.md, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ fontWeight: 700 }}>Cupón</div>
          {couponPreview.status === 'valid' ? <Badge variant="success">Aplicado</Badge> : null}
          {couponPreview.status === 'invalid' ? <Badge variant="error">No válido</Badge> : null}
        </div>
        <div style={summaryMutedTextStyle}>
          Aplicalo antes de crear la orden. Si es válido, el descuento impacta de inmediato en el total.
        </div>
        <div style={{ display: 'flex', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
          <Input
            placeholder="Ej. BIENVENIDA10"
            value={couponCode}
            onChange={(event) => onCouponCodeChange(event.target.value)}
            style={{ minWidth: 0, flex: '1 1 180px' }}
          />
          <Button variant="secondary" onClick={onApplyCoupon} disabled={isCouponLoading}>
            {isCouponLoading ? 'Validando...' : 'Aplicar'}
          </Button>
        </div>
        {isCouponLoading ? <LoadingBlock label="Recalculando total con el cupón..." /> : null}
        {couponPreview.message ? (
          <div style={getCouponMessageStyle(couponPreview.status === 'valid')}>
            {couponPreview.message}
          </div>
        ) : (
          <div style={summaryMutedTextStyle}>
            Si no tenés código, podés continuar con el total actual.
          </div>
        )}
      </div>

      <div style={summaryPanelStyle}>
        <div style={{ display: 'grid', gap: theme.spacing.sm }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: theme.spacing.md, flexWrap: 'wrap' }}>
            <span style={summaryAmountLabelStyle}>Subtotal</span>
            <strong style={{ minWidth: 0, marginLeft: 'auto', textAlign: 'right' }}>{formatMoney(preview.subtotalAmount, preview.currency)}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: theme.spacing.md, flexWrap: 'wrap' }}>
            <span style={summaryAmountLabelStyle}>Envío</span>
            <strong style={{ minWidth: 0, marginLeft: 'auto', textAlign: 'right' }}>{formatMoney(preview.shippingCostAmount, preview.currency)}</strong>
          </div>
          {preview.discountAmount > 0 ? (
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: theme.spacing.md, flexWrap: 'wrap' }}>
              <span style={summaryDiscountLabelStyle}>
                {preview.appliedCouponCode ? `Descuento (${preview.appliedCouponCode})` : 'Descuento'}
              </span>
              <strong style={summaryDiscountValueStyle}>
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
            <span style={summaryMutedTextStyle}>Total final</span>
            <span style={summaryTotalCaptionStyle}>
              Total confirmado antes del pago
            </span>
          </div>
          <strong style={summaryTotalValueStyle}>
            {formatMoney(preview.totalAmount, preview.currency)}
          </strong>
        </div>
      </div>

      {isQuoteLoading ? <LoadingBlock label="Actualizando cotización de envío..." /> : null}

      <div style={getSubmitHintStyle(Boolean(disabledReason))}>
        {disabledReason ?? 'Después de crear la orden vas a poder continuar al pago y seguir el estado desde la pantalla pública de órdenes.'}
      </div>

      <div style={summaryCompactPanelStyle}>
        <div style={{ display: 'flex', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
          <Badge variant="success">Compra segura</Badge>
          <Badge variant="neutral">Sin cargos ocultos</Badge>
          <Badge variant="neutral">Confirmación por email</Badge>
        </div>
        <div style={summaryMutedBodyStyle}>
          El total final queda visible antes del pago y la orden se confirma con los datos reales de stock, envío y cupón.
        </div>
      </div>

      <Button onClick={onSubmit} disabled={isSubmitting || !canSubmit || isQuoteLoading || isCouponLoading} aria-busy={isSubmitting} style={{ width: '100%' }}>
        {isSubmitting ? 'Creando orden...' : 'Crear orden y continuar'}
      </Button>
    </Card>
  )
}

const summaryMutedTextStyle: CSSProperties = {
  color: theme.colors.textMuted
}

const summaryMutedBodyStyle: CSSProperties = {
  ...summaryMutedTextStyle,
  lineHeight: 1.5
}

const summaryPanelStyle: CSSProperties = {
  display: 'grid',
  gap: theme.spacing.md,
  padding: theme.spacing.lg,
  borderRadius: theme.radius.md,
  background: theme.colors.bgSurfaceAlt,
  border: `1px solid ${theme.colors.borderDefault}`
}

const summaryCompactPanelStyle: CSSProperties = {
  display: 'grid',
  gap: theme.spacing.sm,
  padding: theme.spacing.md,
  borderRadius: theme.radius.md,
  background: theme.colors.bgSurfaceAlt,
  border: `1px solid ${theme.colors.borderDefault}`
}

const summaryAmountLabelStyle: CSSProperties = {
  ...summaryMutedTextStyle,
  minWidth: 0
}

const summaryDiscountLabelStyle: CSSProperties = {
  ...summaryAmountLabelStyle,
  overflowWrap: 'anywhere'
}

const summaryDiscountValueStyle: CSSProperties = {
  color: theme.colors.success,
  minWidth: 0,
  marginLeft: 'auto',
  textAlign: 'right'
}

const summaryTotalCaptionStyle: CSSProperties = {
  ...summaryMutedTextStyle,
  fontSize: theme.typography.small.size
}

const summaryTotalValueStyle: CSSProperties = {
  fontSize: theme.typography.display.size,
  lineHeight: 1,
  color: theme.colors.textPrimary,
  minWidth: 0,
  overflowWrap: 'anywhere',
  textAlign: 'right',
  marginLeft: 'auto'
}

function getSummaryCardStyle(isDesktop: boolean, isMobile: boolean): CSSProperties {
  return {
    position: isDesktop ? 'sticky' : 'static',
    top: isDesktop ? theme.spacing.xl : undefined,
    alignSelf: 'start',
    maxWidth: '100%',
    display: 'grid',
    gap: theme.spacing.lg,
    padding: isMobile ? theme.spacing.xl : undefined,
    borderColor: theme.colors.borderDefault
  }
}

function getCouponMessageStyle(isValid: boolean): CSSProperties {
  const statusColor = isValid ? theme.colors.success : theme.colors.error
  return {
    color: statusColor,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    background: alpha(statusColor, 0.1),
    border: `1px solid ${alpha(statusColor, 0.2)}`,
    boxShadow: 'none'
  }
}

function getSubmitHintStyle(isDisabled: boolean): CSSProperties {
  return {
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    background: isDisabled ? alpha(theme.colors.warning, 0.1) : theme.colors.bgSurfaceAlt,
    border: `1px solid ${isDisabled ? alpha(theme.colors.warning, 0.2) : theme.colors.borderDefault}`,
    color: isDisabled ? theme.colors.warning : theme.colors.textMuted
  }
}
