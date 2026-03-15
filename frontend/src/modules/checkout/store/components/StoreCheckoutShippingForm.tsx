import FormField from '../../../../ui/components/FormField'
import { LoadingBlock, Button, Card } from '../../../../design-system/components'
import { theme } from '../../../../app/theme'
import { formatMoney } from '../../../../core/utils/format'
import type { StoreShippingQuoteRes } from '../../../../api/contracts/v1/store'
import Input from '../../../../design-system/components/Input'

type StoreCheckoutShippingFormProps = {
  postalCode: string
  postalCodeError: string | null
  quote: StoreShippingQuoteRes | null
  isLoading: boolean
  onPostalCodeChange: (value: string) => void
  onQuote: () => void
}

export function StoreCheckoutShippingForm({
  postalCode,
  postalCodeError,
  quote,
  isLoading,
  onPostalCodeChange,
  onQuote
}: StoreCheckoutShippingFormProps) {
  return (
    <Card>
      <div style={{ display: 'grid', gap: theme.spacing.md }}>
        <FormField
          label="Código postal"
          helpText="Usamos el backend STORE para validar disponibilidad y costo."
          error={postalCodeError ?? undefined}
        >
          <Input
            value={postalCode}
            onChange={(event) => onPostalCodeChange(event.target.value)}
            placeholder="Ej. 1234"
          />
        </FormField>

        <div>
          <Button onClick={onQuote} disabled={isLoading}>
            {isLoading ? 'Cotizando...' : 'Cotizar envío'}
          </Button>
        </div>

        {isLoading && <LoadingBlock label="Cotizando envío..." />}

        {quote && (
          <div
            style={{
              border: `1px solid ${theme.colors.border}`,
              borderRadius: theme.radius.md,
              padding: theme.spacing.lg,
              background: theme.colors.surfaceAlt
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Envío disponible</div>
            <div style={{ color: theme.colors.textMuted }}>
              {formatMoney(quote.costAmount, quote.currency)} para CP {quote.postalCode}
            </div>
            <div style={{ color: theme.colors.textMuted, marginTop: 4 }}>
              Zona aplicada: {quote.zoneId}
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
