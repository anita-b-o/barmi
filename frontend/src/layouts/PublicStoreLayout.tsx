import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import PlatformLayout from './PlatformLayout'
import { routes } from '@/core/constants/routes'
import { useCart } from '@/features/store/cart/cartContext'
import { theme } from '@/app/theme'
import Badge from '@/components/primitives/Badge'
import Button from '@/components/primitives/Button'
import type { PublicStoreCapability } from '@/api/contracts/v1/public'
import { hasPublicStoreCapability } from '@/api/adapters/publicAdapter'

function publicStoreSlugFromPath(pathname: string) {
  const match = pathname.match(/^\/public\/([^/]+)/)
  if (!match?.[1]) return null
  try {
    return decodeURIComponent(match[1])
  } catch {
    return match[1]
  }
}

type PublicStoreLayoutProps = {
  children: React.ReactNode
  showCatalogNav?: boolean
  showCheckoutNav?: boolean
  storeName?: string | null
  storeDescription?: string | null
  capabilities?: PublicStoreCapability[] | null
}

export default function PublicStoreLayout({
  children,
  showCatalogNav = true,
  showCheckoutNav = true,
  storeName,
  storeDescription,
  capabilities
}: PublicStoreLayoutProps) {
  const location = useLocation()
  const cart = useCart()
  const storeSlug = publicStoreSlugFromPath(location.pathname) ?? cart.storeSlug ?? 'demo-store'
  const cartItems = cart.items.reduce((sum, item) => sum + item.qty, 0)
  const publicStorePath = routes.publicStore(storeSlug)
  const productsEnabled = showCatalogNav && hasPublicStoreCapability(capabilities, 'PRODUCTS')
  const aboutEnabled = hasPublicStoreCapability(capabilities, 'ABOUT')
  const contactEnabled = hasPublicStoreCapability(capabilities, 'CONTACT')
  const title = storeName?.trim() || 'Tienda'
  const subtitle = storeDescription?.trim() || 'Información y atención de la tienda.'
  const headerMeta = cartItems > 0
    ? <Badge variant="success">{cartItems} item{cartItems === 1 ? '' : 's'} en carrito</Badge>
    : undefined
  const navLinkStyle = ({ isActive }: { isActive: boolean }) => ({
    color: isActive ? theme.colors.actionPrimary : theme.colors.textPrimary,
    textDecoration: 'none',
    fontWeight: isActive ? 700 : 600,
    padding: '10px 6px',
    borderRadius: theme.radius.pill,
    background: 'transparent',
    borderBottom: `2px solid ${isActive ? theme.colors.actionPrimary : 'transparent'}`,
    whiteSpace: 'nowrap',
    transition: 'border-color 0.2s ease, color 0.2s ease'
  })

  return (
    <PlatformLayout
      context="store"
      eyebrow={productsEnabled ? 'Tienda online' : 'Tienda'}
      title={title}
      subtitle={location.pathname.startsWith('/store/')
        ? 'Compra y seguimiento de tu pedido.'
        : subtitle}
      headerMeta={headerMeta}
      headerActions={(
        <>
          {showCheckoutNav ? (
            <NavLink to={routes.storeCheckout} style={{ textDecoration: 'none' }}>
              <Button variant="primary">Carrito{cartItems > 0 ? ` (${cartItems})` : ''}</Button>
            </NavLink>
          ) : null}
        </>
      )}
      feedbackStoreSlug={storeSlug}
      navigation={(
        <>
          <NavLink to={publicStorePath} end style={navLinkStyle}>Inicio</NavLink>
          {productsEnabled ? <NavLink to={`${publicStorePath}#productos`} style={navLinkStyle}>Productos</NavLink> : null}
          {!productsEnabled && aboutEnabled ? <NavLink to={`${publicStorePath}#sobre-nosotros`} style={navLinkStyle}>Sobre nosotros</NavLink> : null}
          {contactEnabled ? <NavLink to={`${publicStorePath}#contacto`} style={navLinkStyle}>Contacto</NavLink> : null}
        </>
      )}
    >
      {children}
    </PlatformLayout>
  )
}
