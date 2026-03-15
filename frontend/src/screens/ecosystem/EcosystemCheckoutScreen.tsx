import { Link, useNavigate } from 'react-router-dom'
import { EcosystemLayout } from '../../layouts'
import { theme } from '../../app/theme'
import { routes } from '../../core/constants/routes'
import { PageHeader } from '../../design-system/patterns'
import { EmptyState, ErrorAlert, LoadingBlock } from '../../design-system/components'
import {
  EcosystemCheckoutCartSummary,
  EcosystemCheckoutOrderSummary,
  EcosystemCheckoutShippingForm,
  useEcosystemCheckout
} from '../../modules/ecosystem'

export default function EcosystemCheckoutScreen() {
  const navigate = useNavigate()
  const checkout = useEcosystemCheckout()

  return (
    <EcosystemLayout>
      <PageHeader
        title="Ecosystem Checkout"
        subtitle={checkout.ecosystem ? `${checkout.ecosystem.name} · ${checkout.slug}` : `Slug público: ${checkout.slug}`}
        actions={<Link to={routes.ecosystemCatalog} style={{ color: theme.colors.primary, textDecoration: 'none' }}>Volver al catálogo</Link>}
      />

      {checkout.error && (
        <div style={{ marginBottom: theme.spacing.xl }}>
          <ErrorAlert message={checkout.error} />
        </div>
      )}

      {checkout.isLoading ? (
        <LoadingBlock label="Cargando checkout del ecosystem..." />
      ) : (
        <div style={{ display: 'grid', gap: theme.spacing.xl }}>
          <EcosystemCheckoutCartSummary
            items={checkout.cartItems}
            onIncrease={checkout.increaseItem}
            onDecrease={checkout.decreaseItem}
          />

          {checkout.cartItems.length === 0 ? (
            <EmptyState
              title="Carrito vacío"
              description="Volvé al catálogo del ecosystem para agregar productos externos."
            />
          ) : (
            <>
              <EcosystemCheckoutShippingForm
                canQuoteShipping={checkout.preview.canQuoteShipping}
                postalCode={checkout.postalCode}
                postalCodeError={checkout.postalCodeError}
                isLoading={checkout.isQuoteLoading}
                shippingAvailable={checkout.quote?.available ?? false}
                shippingSummary={
                  checkout.quote
                    ? checkout.quote.available
                      ? `Envío ${checkout.quote.zoneId ? `zona ${checkout.quote.zoneId} · ` : ''}${checkout.quote.costAmount !== null && checkout.quote.currency ? new Intl.NumberFormat('es-AR', { style: 'currency', currency: checkout.quote.currency }).format(checkout.quote.costAmount) : ''}`
                      : 'No hay envío disponible para ese código postal.'
                    : null
                }
                onPostalCodeChange={checkout.setPostalCode}
                onQuote={checkout.requestQuote}
              />

              <EcosystemCheckoutOrderSummary
                preview={checkout.preview}
                isSubmitting={checkout.isCheckoutLoading}
                onSubmit={async () => {
                  const successState = await checkout.submitOrder()
                  if (successState) {
                    navigate(routes.ecosystemCheckoutSuccess, { state: successState })
                  }
                }}
              />
            </>
          )}
        </div>
      )}
    </EcosystemLayout>
  )
}
