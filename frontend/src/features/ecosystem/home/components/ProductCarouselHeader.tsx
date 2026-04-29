import { Link } from 'react-router-dom'

type ProductCarouselHeaderProps = {
  title: string
  titleId: string
  viewMoreHref: string
}

export function ProductCarouselHeader({ title, titleId, viewMoreHref }: ProductCarouselHeaderProps) {
  return (
    <div className="ecosystem-product-rails__header">
      <h2 id={titleId} className="ecosystem-product-rails__title">{title}</h2>
      <Link className="ecosystem-product-rails__view-more" to={viewMoreHref}>
        Ver más...
      </Link>
    </div>
  )
}
