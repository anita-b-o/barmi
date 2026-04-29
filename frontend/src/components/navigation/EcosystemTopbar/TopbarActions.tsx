import { Link } from 'react-router-dom'
import type { EcosystemActionItem } from './config'
import { CartIcon } from './icons'

type TopbarActionsProps = {
  actions: EcosystemActionItem[]
  cartCount: number
  checkoutHref: string
  onNavigate?: () => void
}

export function TopbarActions({ actions, cartCount, checkoutHref, onNavigate }: TopbarActionsProps) {
  return (
    <div className="ecosystem-topbar__actions" aria-label="Acciones de usuario">
      {actions.map((action) => (
        <Link key={action.kind} className="ecosystem-topbar__action-link" to={action.href} onClick={onNavigate}>
          {action.label}
        </Link>
      ))}
      <Link className="ecosystem-topbar__cart-link" to={checkoutHref} aria-label={`Carrito${cartCount > 0 ? `, ${cartCount} productos` : ''}`} onClick={onNavigate}>
        <CartIcon />
        {cartCount > 0 ? <span className="ecosystem-topbar__cart-count">{cartCount}</span> : null}
      </Link>
    </div>
  )
}
