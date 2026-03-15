import { Button, Input } from '../../../../design-system/components'
import { SectionCard } from '../../../../design-system/patterns'
import { theme } from '../../../../app/theme'

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
  return (
    <SectionCard title="Envío">
      {!canQuoteShipping ? (
        <div style={{ color: theme.colors.textMuted }}>
          El backend soporta shipping quote, pero este carrito incluye productos sin entrega.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: theme.spacing.md }}>
          <Input
            value={postalCode}
            onChange={(event) => onPostalCodeChange(event.target.value)}
            placeholder="Código postal"
          />
          {postalCodeError && <div style={{ color: theme.colors.danger }}>{postalCodeError}</div>}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <Button onClick={onQuote} disabled={isLoading}>
              {isLoading ? 'Cotizando...' : 'Cotizar envío'}
            </Button>
            {shippingSummary && (
              <span style={{ color: shippingAvailable ? theme.colors.text : theme.colors.warning }}>
                {shippingSummary}
              </span>
            )}
          </div>
        </div>
      )}
    </SectionCard>
  )
}
