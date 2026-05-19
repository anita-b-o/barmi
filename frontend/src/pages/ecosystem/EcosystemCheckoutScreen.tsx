import { useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { EcosystemLayout } from '../../layouts'
import { appConfig } from '@/app/config/env'
import { alpha, theme } from '@/app/theme'
import { useViewportMode } from '@/core/hooks/useViewportMode'
import { routes } from '@/core/constants/routes'
import EmptyState from '@/components/feedback/EmptyState'
import ErrorState from '@/components/feedback/ErrorState'
import LoadingState from '@/components/feedback/LoadingState'
import Badge from '@/components/primitives/Badge'
import Button from '@/components/primitives/Button'
import Card from '@/components/primitives/Card'
import {
  EcosystemCheckoutCartSummary,
  EcosystemCheckoutOrderSummary,
  EcosystemCheckoutShippingForm,
  useEcosystemCheckout
} from '@/features/ecosystem'
import { SurfaceCard } from '@/features/ecosystem/components/SurfaceCard'
import '@/features/ecosystem/components/ecosystem-marketplace.css'
import { formatMoney } from '@/core/utils/format'
import { trackBetaEvent } from '@/features/beta'

export default function EcosystemCheckoutScreen() {
  const navigate = useNavigate()
  const viewportMode = useViewportMode()
  const isMobile = viewportMode === 'mobile'
  const isDesktop = viewportMode === 'desktop'
  const checkout = useEcosystemCheckout()
  const canSubmit = Boolean(
    checkout.cartItems.length > 0
    && (
      !checkout.requiresShippingQuote
      || checkout.quote?.available
    )
  )
  const disabledReason = checkout.cartItems.length === 0
    ? 'Agregá productos del ecosystem para continuar.'
    : checkout.requiresShippingQuote && !checkout.quote
      ? 'Calculá el envío para confirmar el total final antes de crear la orden.'
      : checkout.requiresShippingQuote && checkout.quote && !checkout.quote.available
        ? 'No hay envío disponible para ese código postal. Cambiá el destino o revisá el carrito antes de continuar.'
      : null

  const totalItems = useMemo(
    () => checkout.cartItems.reduce((sum, item) => sum + item.qty, 0),
    [checkout.cartItems]
  )
  const totalLabel = formatMoney(checkout.preview.totalAmount, checkout.preview.currency)
  const trackedCheckoutStartRef = useRef(false)

  useEffect(() => {
    if (checkout.cartItems.length === 0) return
    if (trackedCheckoutStartRef.current) return
    trackedCheckoutStartRef.current = true
    trackBetaEvent({
      eventName: 'checkout_started',
      ecosystemSlug: appConfig.publicEcosystemSlug,
      metadata: {
        surface: 'ecosystem_checkout'
      }
    })
  }, [checkout.cartItems.length])

  return (
    <EcosystemLayout>
      <main className="ecosystem-checkout-page">
        <SurfaceCard variant="inverse" className="ecosystem-checkout-page__hero">
          <div className="ecosystem-checkout-page__hero-copy">
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Badge variant="info">Checkout</Badge>
              <Badge variant="success">{totalLabel}</Badge>
              <Badge variant="warning">{totalItems} item{totalItems === 1 ? '' : 's'}</Badge>
              {checkout.preview.canQuoteShipping ? <Badge variant="success">Cotiza envío</Badge> : null}
            </div>
            <h1>Checkout ecosystem</h1>
            <p>
              Marketplace claro, compra simple. Validación backend, resumen compacto y continuidad real hacia el pago.
            </p>
          </div>
          <div className="ecosystem-checkout-page__hero-actions">
            <Button variant="secondary" onClick={() => navigate(routes.ecosystemCatalog)}>
              Volver a explorar productos
            </Button>
            <Button variant="ghost" onClick={() => navigate(routes.ecosystemStoresMap)}>
              Ver tiendas del ecosystem
            </Button>
          </div>
        </SurfaceCard>

        {checkout.cartItems.length === 0 ? (
          <div className="ecosystem-checkout-page__state">
            <EmptyState
              title="Carrito vacío"
              description="Todavía no agregaste productos externos. Volvé al catálogo y seguí explorando el marketplace."
              actionLabel="Ir al catálogo del ecosystem"
              onAction={() => navigate(routes.ecosystemCatalog)}
            />
          </div>
        ) : checkout.error ? (
          <div className="ecosystem-checkout-page__state">
            <div style={{ display: 'grid', gap: theme.spacing.md }}>
              <ErrorState message={checkout.error} />
              <div style={{ color: theme.colors.textMuted, lineHeight: 1.6 }}>
                Revisá envío y carrito antes de reintentar. Si el problema persiste, usá feedback beta y decinos qué paso no quedó claro.
              </div>
            </div>
          </div>
        ) : checkout.isLoading ? (
          <div className="ecosystem-checkout-page__state">
            <LoadingState label="Cargando checkout del ecosystem..." />
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gap: theme.spacing.xl,
              gridTemplateColumns: isDesktop ? 'minmax(0, 1fr) 388px' : '1fr',
              alignItems: 'start'
            }}
          >
            <div style={{ display: 'grid', gap: theme.spacing.xl, minWidth: 0 }}>
              <EcosystemCheckoutCartSummary
                items={checkout.cartItems}
                subtotalAmount={checkout.preview.subtotalAmount}
                onIncrease={checkout.increaseItem}
                onDecrease={checkout.decreaseItem}
              />

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
                    : checkout.requiresShippingQuote
                      ? 'Todavía falta cotizar el envío para cerrar el total final.'
                    : null
                }
                onPostalCodeChange={checkout.setPostalCode}
                onQuote={checkout.requestQuote}
              />

              <SurfaceCard variant="panel" style={{ padding: isMobile ? theme.spacing.lg : theme.spacing.xl }}>
                <div style={{ display: 'grid', gap: 6 }}>
                  <div style={{ fontSize: theme.typography.title.size, fontWeight: 700, letterSpacing: 0, color: theme.colors.secondary }}>
                    3. Datos
                  </div>
                  <div style={{ color: theme.colors.textMuted, lineHeight: 1.5 }}>
                    La orden se crea con los datos disponibles del checkout actual.
                  </div>
                </div>
              </SurfaceCard>

              <SurfaceCard variant="panel" style={{ padding: isMobile ? theme.spacing.lg : theme.spacing.xl }}>
                <div style={{ display: 'grid', gap: 6 }}>
                  <div style={{ fontSize: theme.typography.title.size, fontWeight: 700, letterSpacing: 0, color: theme.colors.secondary }}>
                    4. Pago
                  </div>
                  <div style={{ color: theme.colors.textMuted, lineHeight: 1.5 }}>
                    Primero se valida la orden. Después continuás al pago.
                  </div>
                </div>
              </SurfaceCard>
            </div>

            <EcosystemCheckoutOrderSummary
              preview={checkout.preview}
              requiresShippingQuote={checkout.requiresShippingQuote}
              shippingAvailable={checkout.quote?.available ?? false}
              isSubmitting={checkout.isCheckoutLoading}
              isQuoteLoading={checkout.isQuoteLoading}
              couponCode={checkout.couponCode}
              couponFeedback={checkout.couponFeedback}
              isCouponLoading={checkout.isCouponLoading}
              canSubmit={canSubmit}
              disabledReason={disabledReason}
              promotions={checkout.ecosystem?.promotions ?? []}
              onCouponCodeChange={checkout.setCouponCode}
              onApplyCoupon={() => { void checkout.applyCoupon() }}
              onSubmit={async () => {
                const successState = await checkout.submitOrder()
                if (successState) {
                  navigate(routes.ecosystemCheckoutSuccess, { state: successState })
                }
              }}
              showPrimaryAction={!isMobile}
            />
          </div>
        )}

        {isMobile && !checkout.error && !checkout.isLoading && checkout.cartItems.length > 0 ? (
          <div
            style={{
              position: 'fixed',
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 30,
              padding: theme.spacing.md,
              background: 'rgba(255,255,255,0.96)',
              backdropFilter: 'none',
              borderTop: `1px solid ${alpha(theme.colors.secondary, 0.08)}`
            }}
          >
            <Card
              style={{
                padding: theme.spacing.md,
                borderColor: alpha(theme.colors.secondary, 0.08),
                boxShadow: 'none',
                display: 'grid',
                gap: theme.spacing.md
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: theme.spacing.md, alignItems: 'center' }}>
                <div style={{ display: 'grid', gap: 2 }}>
                  <span style={{ color: theme.colors.textMuted, fontSize: theme.typography.small.size, fontWeight: 700, letterSpacing: 0, textTransform: 'uppercase' }}>
                    {checkout.requiresShippingQuote && !checkout.quote?.available ? 'Total estimado' : 'Total'}
                  </span>
                  <strong style={{ fontSize: 28, lineHeight: 1, letterSpacing: 0, color: theme.colors.text }}>
                    {totalLabel}
                  </strong>
                </div>
                <Badge variant="neutral">{totalItems} item{totalItems === 1 ? '' : 's'}</Badge>
              </div>
              <Button
                onClick={async () => {
                  const successState = await checkout.submitOrder()
                  if (successState) {
                    navigate(routes.ecosystemCheckoutSuccess, { state: successState })
                  }
                }}
                disabled={checkout.isCheckoutLoading || checkout.isCouponLoading || checkout.isQuoteLoading || !canSubmit}
                aria-busy={checkout.isCheckoutLoading}
                style={{ width: '100%', minHeight: 52 }}
              >
                {checkout.isCheckoutLoading ? 'Creando orden...' : 'Confirmar compra'}
              </Button>
            </Card>
          </div>
        ) : null}
      </main>
    </EcosystemLayout>
  )
}
