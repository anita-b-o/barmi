import FormField from '@/components/forms/Field'
import Button from '@/components/primitives/Button'
import Badge from '@/components/primitives/Badge'
import Card from '@/components/primitives/Card'
import Input from '@/components/primitives/Input'
import LoadingBlock from '@/components/feedback/LoadingState'
import { theme } from '@/app/theme'
import { formatMoney } from '@/core/utils/format'
import type { StoreShippingQuoteRes } from '../../../../api/contracts/v1/store'

type StoreCheckoutShippingFormProps = {
  buyerEmail: string
  buyerEmailError: string | null
  postalCode: string
  postalCodeError: string | null
  quote: StoreShippingQuoteRes | null
  isLoading: boolean
  onBuyerEmailChange: (value: string) => void
  onPostalCodeChange: (value: string) => void
  onQuote: () => void
}

export function StoreCheckoutShippingForm({
  buyerEmail,
  buyerEmailError,
  postalCode,
  postalCodeError,
  quote,
  isLoading,
  onBuyerEmailChange,
  onPostalCodeChange,
  onQuote
}: StoreCheckoutShippingFormProps) {
  return (
    <Card variant="soft" style={{ borderColor: theme.colors.border }}>
      <div style={{ display: 'grid', gap: theme.spacing.lg }}>
        <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
            gap: theme.spacing.md,
            alignItems: 'flex-start',
            flexWrap: 'wrap'
          }}
        >
          <div style={{ display: 'grid', gap: 4 }}>
            <div style={{ fontWeight: 700 }}>Entrega y contacto</div>
            <div style={{ color: theme.colors.textMuted, lineHeight: 1.5 }}>
              Confirmá el email del comprador y cotizá el envío antes de generar la orden.
            </div>
          </div>
          <Badge variant={quote ? 'success' : 'neutral'}>
            {quote ? 'Envío listo' : 'Falta cotizar'}
          </Badge>
        </div>

        <div
          style={{
            display: 'grid',
            gap: theme.spacing.md,
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))'
          }}
        >
          <FormField
            label="Email para notificaciones"
            helpText="Lo usamos para enviarte confirmación de orden, pago y entrega."
            error={buyerEmailError ?? undefined}
          >
            <Input
              type="email"
              value={buyerEmail}
              onChange={(event) => onBuyerEmailChange(event.target.value)}
              placeholder="tu@email.com"
            />
          </FormField>

          <FormField
            label="Código postal"
            helpText="El backend valida costo de envío y disponibilidad para este destino."
            error={postalCodeError ?? undefined}
          >
            <Input
              value={postalCode}
              onChange={(event) => onPostalCodeChange(event.target.value)}
              placeholder="Ej. 1234"
            />
          </FormField>
        </div>

        <div
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
            <div style={{ fontWeight: 600 }}>Cotización de envío STORE</div>
            <div style={{ color: theme.colors.textMuted }}>
              Confirmá este importe para dejar visible el total final antes del pago.
            </div>
          </div>
          <Button onClick={onQuote} disabled={isLoading} aria-busy={isLoading}>
            {isLoading ? 'Cotizando...' : 'Calcular envío'}
          </Button>
        </div>

        {isLoading && <LoadingBlock label="Cotizando envío y validando disponibilidad para este destino..." />}

        {quote && (
          <div
            style={{
              display: 'grid',
              gap: theme.spacing.sm,
              border: `1px solid ${theme.colors.success}`,
              borderRadius: theme.radius.md,
              padding: theme.spacing.lg,
              background: theme.colors.bgSurfaceAlt,
              boxShadow: 'none'
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: theme.spacing.md,
                alignItems: 'center',
                flexWrap: 'wrap'
              }}
            >
              <div style={{ fontWeight: 700, color: theme.colors.success }}>Envío disponible</div>
              <Badge variant="success">Listo para avanzar</Badge>
            </div>
            <div style={{ color: theme.colors.textMuted }}>
              {formatMoney(quote.costAmount, quote.currency)} para CP {quote.postalCode}
            </div>
            <div style={{ color: theme.colors.textMuted }}>
              Zona aplicada: {quote.zoneId}
            </div>
            <div style={{ color: theme.colors.textMuted }}>
              Este importe ya se refleja en el resumen de compra.
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
