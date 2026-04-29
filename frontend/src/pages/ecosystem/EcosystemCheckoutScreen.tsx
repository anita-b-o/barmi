import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { EcosystemLayout } from '../../layouts'
import { alpha, theme } from '@/app/theme'
import { useViewportMode } from '@/core/hooks/useViewportMode'
import { routes } from '@/core/constants/routes'
import EmptyState from '@/components/feedback/EmptyState'
import ErrorState from '@/components/feedback/ErrorState'
import LoadingState from '@/components/feedback/LoadingState'
import Card from '@/components/primitives/Card'
import Badge from '@/components/primitives/Badge'
import Button from '@/components/primitives/Button'
import { Breadcrumbs } from '@/components/navigation'
import {
  EcosystemHeroBadge,
  EcosystemHeroSection,
  EcosystemSurfaceSection,
  EcosystemCheckoutCartSummary,
  EcosystemCheckoutOrderSummary,
  EcosystemCheckoutShippingForm,
  useEcosystemCheckout
} from '@/features/ecosystem'
import { formatMoney } from '@/core/utils/format'

export default function EcosystemCheckoutScreen() {
  const navigate = useNavigate()
  const viewportMode = useViewportMode()
  const isMobile = viewportMode === 'mobile'
  const isDesktop = viewportMode === 'desktop'
  const checkout = useEcosystemCheckout()
  const canSubmit = Boolean(
    checkout.cartItems.length > 0
    && (
      !checkout.preview.canQuoteShipping
      || !checkout.postalCode.trim()
      || checkout.quote
    )
  )
  const disabledReason = checkout.cartItems.length === 0
    ? 'Agregá productos del ecosystem para continuar.'
    : checkout.preview.canQuoteShipping && checkout.postalCode.trim() && !checkout.quote
      ? 'Calculá el envío para confirmar el total final antes de crear la orden.'
      : null

  const totalItems = useMemo(
    () => checkout.cartItems.reduce((sum, item) => sum + item.qty, 0),
    [checkout.cartItems]
  )
  const totalLabel = formatMoney(checkout.preview.totalAmount, checkout.preview.currency)

  return (
    <EcosystemLayout>
      <Breadcrumbs items={[{ label: 'Ecosystem', href: routes.ecosystemHome }, { label: 'Checkout' }]} />

      <div
        style={{
          display: 'grid',
          gap: theme.spacing.xl,
          paddingBottom: isMobile ? 132 : theme.spacing.xxxl
        }}
      >
        <EcosystemHeroSection
          eyebrow="Checkout ecosystem"
          title="Checkout"
          description={`${totalItems} item${totalItems === 1 ? '' : 's'} en tu carrito externo. Totales claros, validación backend y paso a pago sin desordenar la experiencia.`}
          badges={(
            <>
              <EcosystemHeroBadge>{totalLabel}</EcosystemHeroBadge>
              <EcosystemHeroBadge variant="info">{totalItems} item{totalItems === 1 ? '' : 's'}</EcosystemHeroBadge>
              {checkout.preview.canQuoteShipping ? <EcosystemHeroBadge variant="success">Cotiza envío</EcosystemHeroBadge> : null}
            </>
          )}
          actions={!isMobile ? (
            <>
              <Button variant="secondary" onClick={() => navigate(routes.ecosystemCatalog)}>
                Volver a explorar productos
              </Button>
              <Button variant="ghost" onClick={() => navigate(routes.ecosystemStoresMap)}>
                Ver tiendas del ecosystem
              </Button>
            </>
          ) : undefined}
          aside={(
            <>
              <div style={{ color: theme.colors.textMuted, lineHeight: 1.45 }}>
                Marketplace claro, compra simple.
              </div>
              <Button variant="secondary" onClick={() => navigate(routes.ecosystemCatalog)}>
                Volver a explorar productos
              </Button>
              <Button variant="ghost" onClick={() => navigate(routes.ecosystemStoresMap)}>
                Ver tiendas del ecosystem
              </Button>
            </>
          )}
          style={{ padding: isMobile ? theme.spacing.lg : theme.spacing.xxl }}
        />

        {checkout.error ? (
          <EcosystemSurfaceSection>
            <ErrorState message={checkout.error} />
          </EcosystemSurfaceSection>
        ) : null}

        {checkout.isLoading ? (
          <EcosystemSurfaceSection>
            <LoadingState label="Cargando checkout del ecosystem..." />
          </EcosystemSurfaceSection>
        ) : checkout.cartItems.length === 0 ? (
          <EcosystemSurfaceSection>
            <EmptyState
              title="Carrito vacío"
              description="Este carrito público del ecosystem todavía no tiene productos externos. Volvé al catálogo para empezar tu selección."
              actionLabel="Ir al catálogo del ecosystem"
              onAction={() => navigate(routes.ecosystemCatalog)}
            />
          </EcosystemSurfaceSection>
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
                    : null
                }
                onPostalCodeChange={checkout.setPostalCode}
                onQuote={checkout.requestQuote}
              />

              <EcosystemSurfaceSection style={{ padding: isMobile ? theme.spacing.lg : theme.spacing.xl }}>
                <div style={{ display: 'grid', gap: 6 }}>
                  <div style={{ fontSize: theme.typography.title.size, fontWeight: 700, letterSpacing: 0, color: theme.colors.secondary }}>
                    3. Datos
                  </div>
                  <div style={{ color: theme.colors.textMuted, lineHeight: 1.5 }}>
                    La orden se crea con los datos disponibles del checkout actual.
                  </div>
                </div>
              </EcosystemSurfaceSection>

              <EcosystemSurfaceSection style={{ padding: isMobile ? theme.spacing.lg : theme.spacing.xl }}>
                <div style={{ display: 'grid', gap: 6 }}>
                  <div style={{ fontSize: theme.typography.title.size, fontWeight: 700, letterSpacing: 0, color: theme.colors.secondary }}>
                    4. Pago
                  </div>
                  <div style={{ color: theme.colors.textMuted, lineHeight: 1.5 }}>
                    Primero se valida la orden. Después continuás al pago.
                  </div>
                </div>
              </EcosystemSurfaceSection>
            </div>

            <EcosystemCheckoutOrderSummary
              preview={checkout.preview}
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
                    Total
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
      </div>
    </EcosystemLayout>
  )
}
