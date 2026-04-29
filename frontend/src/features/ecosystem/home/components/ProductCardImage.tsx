import { Link } from 'react-router-dom'

type ProductCardImageProps = {
  href: string
  name: string
  imageUrl?: string | null
  imageAlt: string
}

export function ProductCardImage({ href, name, imageUrl, imageAlt }: ProductCardImageProps) {
  return (
    <Link className="ecosystem-product-rails__image-link" to={href} aria-label={`Ver producto ${name}`}>
      {imageUrl ? (
        <img className="ecosystem-product-rails__image" src={imageUrl} alt={imageAlt} />
      ) : (
        <span className="ecosystem-product-rails__image-fallback" aria-label={imageAlt}>
          <span aria-hidden="true" />
        </span>
      )}
    </Link>
  )
}
