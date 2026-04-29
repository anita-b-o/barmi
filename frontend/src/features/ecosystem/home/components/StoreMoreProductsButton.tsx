import { Link } from 'react-router-dom'

type StoreMoreProductsButtonProps = {
  storeName: string
  href: string
}

export function StoreMoreProductsButton({ storeName, href }: StoreMoreProductsButtonProps) {
  return (
    <Link
      className="ecosystem-store-rails__more-products"
      to={href}
      aria-label={`Ver productos de ${storeName}`}
    >
      +
    </Link>
  )
}
