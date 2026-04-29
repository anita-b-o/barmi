import Button from '@/components/primitives/Button'
import Input from '@/components/primitives/Input'
import Badge from '@/components/primitives/Badge'
import Card from '@/components/primitives/Card'
import LoadingBlock from '@/components/feedback/LoadingState'
import { alpha, theme } from '@/app/theme'
import { useViewportMode } from '@/core/hooks/useViewportMode'

type EcosystemCheckoutShippingFormProps = {
  canQuoteShipping: boolean
  postalCode: string
  postalCodeError: string | null
  isLoading: boolean
  shippingAvailable: boolean
  shippingSummary: string | null
  onPostalCodeChange: (value: string) => void
  onQuote: () => void | Promise<unknown>
}

export function EcosystemCheckoutShippingForm({
  canQuoteShipping,
  postalCode,
  postalCodeError,
  isLoading,
  shippingAvailable,
  shippingSummary,
  onPostalCodeChange,
  onQuote
}: EcosystemCheckoutShippingFormProps) {
  const viewportMode = useViewportMode()
  const isMobile = viewportMode === 'mobile'

  return (
    <Card
      style={{
        display: 'grid',
        gap: theme.spacing.lg,
        padding: isMobile ? theme.spacing.lg : theme.spacing.xl,
        borderColor: theme.colors.borderDefault
      }}
    >
      <div style={{ display: 'grid', gap: 6 }}>
        <div style={{ fontSize: theme.typography.title.size, fontWeight: 700, letterSpacing: 0, color: theme.colors.textPrimary }}>
          2. Envío
        </div>
        <div style={{ color: theme.colors.textMuted, lineHeight: 1.5 }}>
          Calculá el envío antes de confirmar.
        </div>
      </div>

      {!canQuoteShipping ? (
        <div
          style={{
            display: 'grid',
            gap: theme.spacing.md,
            padding: theme.spacing.lg,
            borderRadius: theme.radius.lg,
            background: alpha(theme.colors.warning, 0.08),
            border: `1px solid ${alpha(theme.colors.warning, 0.2)}`
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: theme.spacing.md, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ fontWeight: 700 }}>Este carrito no admite entrega</div>
            <Badge variant="warning">Sin shipping quote</Badge>
          </div>
          <div style={{ color: theme.colors.textMuted }}>
            El carrito incluye productos sin soporte de entrega. Podés continuar sin cotizar envío, pero conviene revisar el contenido antes de crear la orden.
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: theme.spacing.md }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1fr) auto',
              gap: theme.spacing.md,
              alignItems: 'center',
            }}
          >
            <Input
              value={postalCode}
              onChange={(event) => onPostalCodeChange(event.target.value)}
              placeholder="Código postal"
              aria-label="Código postal ecosystem"
              style={{ background: theme.colors.bgSurfaceAlt }}
            />
            <Button onClick={onQuote} disabled={isLoading} aria-busy={isLoading} style={{ width: isMobile ? '100%' : undefined }}>
              {isLoading ? 'Cotizando...' : 'Calcular envío'}
            </Button>
          </div>
          {postalCodeError ? <div style={{ color: theme.colors.error }}>{postalCodeError}</div> : null}

          {isLoading ? <LoadingBlock label="Cotizando envío para este destino..." /> : null}

          {shippingSummary ? (
            <div
              style={{
                padding: theme.spacing.md,
                borderRadius: theme.radius.lg,
                background: alpha(shippingAvailable ? theme.colors.success : theme.colors.warning, 0.1),
                border: `1px solid ${alpha(shippingAvailable ? theme.colors.success : theme.colors.warning, 0.2)}`,
                color: shippingAvailable ? theme.colors.textPrimary : theme.colors.warning,
                boxShadow: 'none'
              }}
            >
              {shippingSummary}
            </div>
          ) : null}
        </div>
      )}
    </Card>
  )
}
