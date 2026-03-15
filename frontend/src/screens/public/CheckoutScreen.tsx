import { useNavigate } from 'react-router-dom'
import { PlatformLayout } from '../../layouts'
import { theme } from '../../app/theme'
import { PageHeader, SectionCard } from '../../design-system/patterns'
import ErrorAlert from '../../ui/components/ErrorAlert'
import { routes } from '../../core/constants/routes'
import {
  useStoreCheckout,
  StoreCheckoutCartSummary,
  StoreCheckoutOrderSummary,
  StoreCheckoutShippingForm
} from '../../modules/checkout'

export default function CheckoutScreen() {
  const navigate = useNavigate()
  const checkout = useStoreCheckout()
  const backToStoreHref = checkout.cartStoreSlug ? routes.publicStore(checkout.cartStoreSlug) : routes.publicStore('demo-store')

  const handleSubmit = async () => {
    const successState = await checkout.submitOrder()
    if (!successState) return
    navigate(routes.storeCheckoutSuccess, {
      state: successState
    })
  }

  return (
    <PlatformLayout>
      <PageHeader
        title="Checkout"
        subtitle="Flujo STORE con cotización de envío y creación de orden."
      />

      {checkout.error && (
        <div style={{ marginTop: theme.spacing.lg }}>
          <ErrorAlert message={checkout.error} />
        </div>
      )}

      <div style={{ display: 'grid', gap: theme.spacing.xl, gridTemplateColumns: 'minmax(0, 1.4fr) minmax(300px, 1fr)' }}>
        <div style={{ display: 'grid', gap: theme.spacing.xl }}>
          <SectionCard title="Carrito">
            <StoreCheckoutCartSummary
              items={checkout.cartItems}
              subtotalCents={checkout.subtotalCents}
              backToStoreHref={backToStoreHref}
              onDecrease={checkout.removeItem}
              onIncrease={checkout.increaseItem}
            />
          </SectionCard>

          <SectionCard title="Envío">
            <StoreCheckoutShippingForm
              postalCode={checkout.postalCode}
              postalCodeError={checkout.postalCodeError}
              quote={checkout.quote}
              isLoading={checkout.isQuoteLoading}
              onPostalCodeChange={checkout.setPostalCode}
              onQuote={() => {
                void checkout.requestQuote()
              }}
            />
          </SectionCard>
        </div>

        <SectionCard title="Resumen de orden">
          <StoreCheckoutOrderSummary
            preview={checkout.preview}
            isSubmitting={checkout.isCheckoutLoading}
            onSubmit={() => {
              void handleSubmit()
            }}
            successState={checkout.successState}
          />
        </SectionCard>
      </div>
    </PlatformLayout>
  )
}
