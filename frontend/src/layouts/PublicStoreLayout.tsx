import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import PlatformLayout from './PlatformLayout'
import { routes } from '@/core/constants/routes'
import { useCart } from '@/features/store/cart/cartContext'
import { alpha, theme } from '@/app/theme'
import Badge from '@/components/primitives/Badge'
import Button from '@/components/primitives/Button'

export default function PublicStoreLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const cart = useCart()
  const storeSlug = cart.storeSlug ?? 'demo-store'
  const cartItems = cart.items.reduce((sum, item) => sum + item.qty, 0)
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
      eyebrow="STORE público"
      title="Barmi Store"
      subtitle={location.pathname.startsWith('/store/')
        ? 'Compra y seguimiento dentro del carrito propio de la tienda.'
        : 'Catálogo y compra rápida para la tienda actual.'}
      headerMeta={(
        <>
          <Badge variant="neutral">Storefront público</Badge>
          <Badge variant="neutral" style={{ color: theme.colors.textPrimary, borderColor: alpha(theme.colors.borderStrong, 0.32) }}>Carrito separado del ecosystem</Badge>
          {cartItems > 0 ? <Badge variant="success">{cartItems} item{cartItems === 1 ? '' : 's'} en carrito</Badge> : null}
        </>
      )}
      headerActions={(
        <>
          <NavLink to={routes.ecosystemStoresMap} style={{ textDecoration: 'none' }}>
            <Button variant="ghost">Mapa de tiendas</Button>
          </NavLink>
          <NavLink to={routes.storeCheckout} style={{ textDecoration: 'none' }}>
            <Button variant="primary">Carrito{cartItems > 0 ? ` (${cartItems})` : ''}</Button>
          </NavLink>
        </>
      )}
      navigation={(
        <>
          <NavLink to={routes.publicStore(storeSlug)} end style={navLinkStyle}>Catálogo</NavLink>
          <NavLink to={routes.storeCheckout} style={navLinkStyle}>Checkout{cartItems > 0 ? ` (${cartItems})` : ''}</NavLink>
          <NavLink to={routes.storeOrders} style={navLinkStyle}>Mis órdenes</NavLink>
        </>
      )}
    >
      {children}
    </PlatformLayout>
  )
}
