import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PublicStoreLayout } from '../../layouts'
import { alpha, theme } from '@/app/theme'
import { useViewportMode } from '@/core/hooks/useViewportMode'
import { publicAdapter } from '../../api/adapters/publicAdapter'
import type { PublicStore } from '../../api/contracts/v1/public'
import { SectionCard } from '@/components/navigation'
import ErrorState from '@/components/feedback/ErrorState'
import Card from '@/components/primitives/Card'
import Badge from '@/components/primitives/Badge'
import Button from '@/components/primitives/Button'
import { routes } from '@/core/constants/routes'
import { Breadcrumbs } from '@/components/navigation'
import {
  useStoreCheckout,
  StoreCheckoutCartSummary,
  StoreCheckoutOrderSummary,
  StoreCheckoutShippingForm
} from '@/features/checkout'

export default function CheckoutScreen() {
  const navigate = useNavigate()
  const viewportMode = useViewportMode()
  const isMobile = viewportMode === 'mobile'
  const checkout = useStoreCheckout()
  const backToStoreHref = checkout.cartStoreSlug ? routes.publicStore(checkout.cartStoreSlug) : routes.publicStore('demo-store')
  const [store, setStore] = useState<PublicStore | null>(null)
  const hasAvailabilityIssues = checkout.cartItems.some(
    (item) => item.isAvailable === false || (typeof item.stockQuantity === 'number' && item.stockQuantity < item.qty)
  )
  const canSubmit = Boolean(
    checkout.cartItems.length > 0
    && checkout.buyerEmail.trim()
    && checkout.postalCode.trim()
    && checkout.quote
    && !hasAvailabilityIssues
  )
  const disabledReason = checkout.cartItems.length === 0
    ? 'Agregá al menos un producto para continuar.'
    : hasAvailabilityIssues
      ? 'Hay productos con stock insuficiente. Ajustá el carrito antes de crear la orden.'
      : !checkout.buyerEmail.trim()
        ? 'Ingresá un email válido para recibir la confirmación y las actualizaciones de la compra.'
        : !checkout.postalCode.trim()
          ? 'Ingresá un código postal para cotizar el envío.'
          : !checkout.quote
            ? 'Calculá el envío para confirmar el total final antes de crear la orden.'
            : null

  useEffect(() => {
    let active = true
    if (!checkout.cartStoreSlug) {
      setStore(null)
      return () => {
        active = false
      }
    }
    publicAdapter.getStore(checkout.cartStoreSlug)
      .then((data) => {
        if (!active) return
        setStore(data)
      })
      .catch(() => {
        if (!active) return
        setStore(null)
      })
    return () => {
      active = false
    }
  }, [checkout.cartStoreSlug])

  const handleSubmit = async () => {
    const successState = await checkout.submitOrder()
    if (!successState) return
    navigate(routes.storeCheckoutSuccess, {
      state: successState
    })
  }

  return (
    <PublicStoreLayout>
      <Breadcrumbs
        items={[
          { label: 'Store', href: backToStoreHref },
          { label: 'Checkout' }
        ]}
      />

      <Card
        style={{
          marginBottom: theme.spacing.xl,
          padding: isMobile ? theme.spacing.lg : theme.spacing.xl,
          borderColor: alpha(theme.colors.secondary, 0.08),
          background: theme.colors.bgSurfaceAlt
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: theme.spacing.xl,
            flexWrap: 'wrap'
          }}
        >
          <div style={{ display: 'grid', gap: theme.spacing.md, maxWidth: 780 }}>
            <div style={{ display: 'flex', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
              <Badge variant="neutral">{store?.name ?? 'Store'}</Badge>
              <Badge variant="neutral">Carrito independiente del ecosystem</Badge>
            </div>
            <div style={{ display: 'grid', gap: theme.spacing.sm }}>
              <h1 style={{ margin: 0, fontSize: 'clamp(30px, 5vw, 40px)', lineHeight: 1.05, letterSpacing: 0, color: theme.colors.secondary }}>
                Checkout de la tienda
              </h1>
              <p style={{ margin: 0, color: theme.colors.textMuted, fontSize: 16, lineHeight: 1.55 }}>
                Compra simple, total transparente. Revisá tu compra antes de pagar dentro del carrito propio de esta tienda, sin mezclar productos externos del ecosystem.
              </p>
            </div>
            <div style={{ display: 'flex', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
              <Badge variant="success">{checkout.cartItems.length} productos en carrito</Badge>
              <Badge variant="neutral">{canSubmit ? 'Listo para ordenar' : 'Falta completar datos'}</Badge>
            </div>
          </div>

          <div
            style={{
              minWidth: isMobile ? 0 : 280,
              maxWidth: isMobile ? '100%' : 360,
              flex: '1 1 320px',
              display: 'grid',
              gap: theme.spacing.md,
              padding: theme.spacing.lg,
              borderRadius: theme.radius.lg,
              border: `1px solid ${alpha(theme.colors.secondary, 0.08)}`,
              background: alpha(theme.colors.surface, 0.88),
              boxShadow: 'none'
            }}
          >
            <div style={{ display: 'grid', gap: 6 }}>
              <div style={{ fontSize: theme.typography.small.size, fontWeight: 700, letterSpacing: 0, color: theme.colors.textMuted, textTransform: 'uppercase' }}>
                Navegación cruzada
              </div>
              <div style={{ fontSize: theme.typography.title.size, fontWeight: 700, letterSpacing: 0, color: theme.colors.secondary }}>
                Seguir comprando o volver al ecosystem
              </div>
              <div style={{ color: theme.colors.textMuted, lineHeight: 1.6 }}>
                Composición clara de carrito, entrega y resumen para cerrar la compra de esta tienda sin mezclar el flujo del ecosystem.
              </div>
            </div>
            <Button variant="secondary" onClick={() => navigate(backToStoreHref)}>
              Seguir comprando en tienda
            </Button>
            <Button variant="ghost" onClick={() => navigate(routes.ecosystemStoresMap)}>
              Ver mapa de tiendas
            </Button>
          </div>
        </div>
      </Card>

      <Card
        variant="soft"
        style={{
          marginBottom: theme.spacing.xl,
          padding: theme.spacing.lg,
          borderColor: alpha(theme.colors.secondary, 0.08),
          background: theme.colors.bgSurfaceAlt
        }}
      >
        <div style={{ display: 'flex', gap: theme.spacing.sm, flexWrap: 'wrap', marginBottom: theme.spacing.sm }}>
          <Badge variant="neutral">Carrito de {store?.name ?? 'esta tienda'}</Badge>
          <Badge variant="neutral">Los productos externos del ecosystem se gestionan por separado</Badge>
        </div>
        <div style={{ color: theme.colors.textMuted, lineHeight: 1.5 }}>
          Ajustá el carrito, cotizá envío, aplicá cupón si corresponde y recién después confirmá la orden con el total final a la vista.
        </div>
      </Card>

      {checkout.error && (
        <div style={{ marginTop: theme.spacing.lg }}>
          <ErrorState message={checkout.error} />
        </div>
      )}

      <Card
        variant="soft"
        style={{
          marginBottom: theme.spacing.xl,
          display: 'grid',
          gap: theme.spacing.md,
          background: theme.colors.bgSurfaceAlt,
          borderColor: alpha(theme.colors.secondary, 0.08)
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: theme.spacing.md,
            alignItems: 'flex-start',
            flexWrap: 'wrap'
          }}
        >
          <div style={{ display: 'grid', gap: 6 }}>
            <div style={{ fontWeight: 700, fontSize: theme.typography.title.size }}>Compra simple, total transparente</div>
            <div style={{ color: theme.colors.textMuted, maxWidth: 720 }}>
              Revisá cantidades, confirmá el destino, aplicá tu cupón si corresponde y generá la orden con el total final claro antes de salir al pago.
            </div>
          </div>
          <Badge variant={canSubmit ? 'success' : 'warning'}>
            {canSubmit ? 'Listo para ordenar' : 'Falta completar datos'}
          </Badge>
        </div>

        <div
          style={{
            display: 'grid',
            gap: theme.spacing.sm,
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))'
          }}
        >
          <div style={{ padding: theme.spacing.md, borderRadius: theme.radius.md, background: theme.colors.surface, border: `1px solid ${theme.colors.border}` }}>
            <div style={{ fontWeight: 700 }}>Carrito</div>
            <div style={{ color: theme.colors.textMuted, marginTop: 4 }}>Ajustá items y validá stock visible.</div>
          </div>
          <div style={{ padding: theme.spacing.md, borderRadius: theme.radius.md, background: theme.colors.surface, border: `1px solid ${theme.colors.border}` }}>
            <div style={{ fontWeight: 700 }}>Entrega</div>
            <div style={{ color: theme.colors.textMuted, marginTop: 4 }}>Calculá envío para este código postal.</div>
          </div>
          <div style={{ padding: theme.spacing.md, borderRadius: theme.radius.md, background: theme.colors.surface, border: `1px solid ${theme.colors.border}` }}>
            <div style={{ fontWeight: 700 }}>Pago</div>
            <div style={{ color: theme.colors.textMuted, marginTop: 4 }}>La orden se crea primero y el pago continúa después.</div>
          </div>
        </div>
      </Card>

      <div
        style={{
          display: 'grid',
          gap: theme.spacing.xl,
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          alignItems: 'start'
        }}
      >
        <div style={{ display: 'grid', gap: theme.spacing.xl, minWidth: 0 }}>
          <SectionCard
            title="Carrito"
            description="Ajustá cantidades y dejá el pedido listo antes de pasar al resumen final."
          >
            <StoreCheckoutCartSummary
              items={checkout.cartItems}
              subtotalCents={checkout.subtotalCents}
              backToStoreHref={backToStoreHref}
              onDecrease={checkout.removeItem}
              onIncrease={checkout.increaseItem}
              onSetQuantity={checkout.setItemQuantity}
              onRemove={checkout.removeLineItem}
              isAvailabilityLoading={checkout.isAvailabilityLoading}
              availabilityError={checkout.availabilityError}
            />
          </SectionCard>

          <SectionCard
            title="Comprador y entrega"
            description="Completá el contacto y confirmá el envío para este destino."
          >
            <StoreCheckoutShippingForm
              buyerEmail={checkout.buyerEmail}
              buyerEmailError={checkout.buyerEmailError}
              postalCode={checkout.postalCode}
              postalCodeError={checkout.postalCodeError}
              quote={checkout.quote}
              isLoading={checkout.isQuoteLoading}
              onBuyerEmailChange={checkout.setBuyerEmail}
              onPostalCodeChange={checkout.setPostalCode}
              onQuote={() => {
                void checkout.requestQuote()
              }}
            />
          </SectionCard>
        </div>

        <StoreCheckoutOrderSummary
          preview={checkout.preview}
          isSubmitting={checkout.isCheckoutLoading}
          isQuoteLoading={checkout.isQuoteLoading}
          isCouponLoading={checkout.isCouponLoading}
          canSubmit={canSubmit}
          disabledReason={disabledReason}
          couponCode={checkout.couponCode}
          couponPreview={checkout.couponPreview}
          promotions={store?.promotions ?? []}
          onCouponCodeChange={checkout.setCouponCode}
          onApplyCoupon={() => {
            void checkout.applyCoupon()
          }}
          onSubmit={() => {
            void handleSubmit()
          }}
          successState={checkout.successState}
        />
      </div>
    </PublicStoreLayout>
  )
}
