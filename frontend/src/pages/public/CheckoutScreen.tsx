import { type CSSProperties, useEffect, useRef, useState } from 'react'
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
import { trackBetaEvent } from '@/features/beta'

export default function CheckoutScreen() {
  const navigate = useNavigate()
  const viewportMode = useViewportMode()
  const isMobile = viewportMode === 'mobile'
  const checkout = useStoreCheckout()
  const backToStoreHref = checkout.cartStoreSlug ? routes.publicStore(checkout.cartStoreSlug) : routes.publicStore('demo-store')
  const [store, setStore] = useState<PublicStore | null>(null)
  const trackedCheckoutStartRef = useRef(false)
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

  useEffect(() => {
    if (checkout.cartItems.length === 0) return
    if (trackedCheckoutStartRef.current) return
    trackedCheckoutStartRef.current = true
    trackBetaEvent({
      eventName: 'checkout_started',
      storeId: store?.id,
      storeSlug: store?.slug,
      storeName: store?.name,
      metadata: {
        surface: 'store_checkout'
      }
    })
  }, [checkout.cartItems.length, store?.id, store?.name, store?.slug])

  const handleSubmit = async () => {
    const successState = await checkout.submitOrder()
    if (!successState) return
    navigate(routes.storeCheckoutSuccess, {
      state: successState
    })
  }

  return (
    <PublicStoreLayout
      storeName={store?.name}
      storeDescription={store?.profile.description}
      capabilities={store?.capabilities}
    >
      <Breadcrumbs
        items={[
          { label: store?.name ?? 'Tienda', href: backToStoreHref },
          { label: 'Finalizar compra' }
        ]}
      />

      <Card
        style={getHeroCardStyle(isMobile)}
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
              <Badge variant="neutral">{store?.name ?? 'Tienda'}</Badge>
              <Badge variant="neutral">Compra en curso</Badge>
            </div>
            <div style={{ display: 'grid', gap: theme.spacing.sm }}>
              <h1 style={checkoutHeroTitleStyle}>
                Finalizar compra
              </h1>
              <p style={checkoutHeroDescriptionStyle}>
                Revisá tu compra, confirmá el envío y avanzá con el total final claro.
              </p>
            </div>
            <div style={{ display: 'flex', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
              <Badge variant="success">{checkout.cartItems.length} productos en carrito</Badge>
              <Badge variant="neutral">{canSubmit ? 'Listo para ordenar' : 'Falta completar datos'}</Badge>
            </div>
          </div>

          <div style={getNavigationPanelStyle(isMobile)}>
            <div style={{ display: 'grid', gap: 6 }}>
              <div style={checkoutEyebrowStyle}>
                ¿Querés seguir mirando?
              </div>
              <div style={checkoutPanelTitleStyle}>
                Podés volver a la tienda
              </div>
              <div style={checkoutPanelTextStyle}>
                Tu compra queda guardada mientras revisás otros productos de esta tienda.
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
        style={checkoutIntroCardStyle}
      >
        <div style={{ display: 'flex', gap: theme.spacing.sm, flexWrap: 'wrap', marginBottom: theme.spacing.sm }}>
          <Badge variant="neutral">Carrito de {store?.name ?? 'esta tienda'}</Badge>
          <Badge variant="neutral">Total calculado al confirmar</Badge>
        </div>
        <div style={checkoutIntroTextStyle}>
          Ajustá el carrito, cotizá envío, aplicá cupón si corresponde y recién después confirmá la orden con el total final a la vista.
        </div>
      </Card>

      {checkout.error && (
        <div style={{ marginTop: theme.spacing.lg }}>
          <div style={{ display: 'grid', gap: theme.spacing.sm }}>
            <ErrorState message={checkout.error} />
            <div style={checkoutPanelTextStyle}>
              Revisá email, carrito y código postal. Si vuelve a fallar, enviá feedback beta desde esta pantalla con el paso exacto donde quedó trabado.
            </div>
          </div>
        </div>
      )}

      <Card
        variant="soft"
        style={checkoutStepsCardStyle}
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
            <div style={checkoutPanelTitleStyle}>Compra simple, total transparente</div>
            <div style={checkoutStepsDescriptionStyle}>
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
          <div style={checkoutStepItemStyle}>
            <div style={{ fontWeight: 700 }}>Carrito</div>
            <div style={checkoutStepTextStyle}>Ajustá items y validá stock visible.</div>
          </div>
          <div style={checkoutStepItemStyle}>
            <div style={{ fontWeight: 700 }}>Entrega</div>
            <div style={checkoutStepTextStyle}>Calculá envío para este código postal.</div>
          </div>
          <div style={checkoutStepItemStyle}>
            <div style={{ fontWeight: 700 }}>Pago</div>
            <div style={checkoutStepTextStyle}>La orden se crea primero y el pago continúa después.</div>
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

const checkoutMutedTextStyle: CSSProperties = {
  color: theme.colors.textMuted
}

const checkoutHeroTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: 'clamp(30px, 5vw, 40px)',
  lineHeight: 1.05,
  letterSpacing: 0,
  color: theme.colors.textPrimary
}

const checkoutHeroDescriptionStyle: CSSProperties = {
  ...checkoutMutedTextStyle,
  margin: 0,
  fontSize: 16,
  lineHeight: 1.55
}

const checkoutEyebrowStyle: CSSProperties = {
  ...checkoutMutedTextStyle,
  fontSize: theme.typography.small.size,
  fontWeight: 700,
  letterSpacing: 0,
  textTransform: 'uppercase'
}

const checkoutPanelTitleStyle: CSSProperties = {
  fontSize: theme.typography.title.size,
  fontWeight: 700,
  letterSpacing: 0,
  color: theme.colors.textPrimary
}

const checkoutPanelTextStyle: CSSProperties = {
  ...checkoutMutedTextStyle,
  lineHeight: 1.6
}

const checkoutIntroCardStyle: CSSProperties = {
  marginBottom: theme.spacing.xl,
  padding: theme.spacing.lg,
  borderColor: alpha(theme.colors.textPrimary, 0.08),
  background: theme.colors.bgSurfaceAlt
}

const checkoutIntroTextStyle: CSSProperties = {
  ...checkoutMutedTextStyle,
  lineHeight: 1.5
}

const checkoutStepsCardStyle: CSSProperties = {
  marginBottom: theme.spacing.xl,
  display: 'grid',
  gap: theme.spacing.md,
  background: theme.colors.bgSurfaceAlt,
  borderColor: alpha(theme.colors.textPrimary, 0.08)
}

const checkoutStepsDescriptionStyle: CSSProperties = {
  ...checkoutMutedTextStyle,
  maxWidth: 720
}

const checkoutStepItemStyle: CSSProperties = {
  padding: theme.spacing.md,
  borderRadius: theme.radius.md,
  background: theme.colors.bgSurface,
  border: `1px solid ${theme.colors.borderDefault}`
}

const checkoutStepTextStyle: CSSProperties = {
  ...checkoutMutedTextStyle,
  marginTop: 4
}

function getHeroCardStyle(isMobile: boolean): CSSProperties {
  return {
    marginBottom: theme.spacing.xl,
    padding: isMobile ? theme.spacing.lg : theme.spacing.xl,
    borderColor: alpha(theme.colors.textPrimary, 0.08),
    background: theme.colors.bgSurfaceAlt
  }
}

function getNavigationPanelStyle(isMobile: boolean): CSSProperties {
  return {
    minWidth: isMobile ? 0 : 280,
    maxWidth: isMobile ? '100%' : 360,
    flex: '1 1 320px',
    display: 'grid',
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
    borderRadius: theme.radius.lg,
    border: `1px solid ${alpha(theme.colors.textPrimary, 0.08)}`,
    background: alpha(theme.colors.bgSurface, 0.88),
    boxShadow: 'none'
  }
}
