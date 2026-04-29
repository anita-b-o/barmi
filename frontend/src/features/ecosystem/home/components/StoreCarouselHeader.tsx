import { Link } from 'react-router-dom'

type StoreCarouselHeaderProps = {
  title: string
  titleId: string
  viewMoreHref: string
}

export function StoreCarouselHeader({ title, titleId, viewMoreHref }: StoreCarouselHeaderProps) {
  return (
    <div className="ecosystem-store-rails__header">
      <h2 id={titleId} className="ecosystem-store-rails__title">{title}</h2>
      <Link className="ecosystem-store-rails__view-more" to={viewMoreHref}>
        Ver más...
      </Link>
    </div>
  )
}
