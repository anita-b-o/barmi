import { Link } from 'react-router-dom'
import './EmptyCarouselState.css'

type EmptyCarouselStateProps = {
  message?: string
  ctaHref?: string
  ctaLabel?: string
}

export function EmptyCarouselState({
  message = 'No hay nada para mostrar en esta categoría',
  ctaHref,
  ctaLabel
}: EmptyCarouselStateProps) {
  return (
    <div className="ecosystem-empty-carousel" role="status">
      <div className="ecosystem-empty-carousel__icon" aria-hidden="true" />
      <div className="ecosystem-empty-carousel__message">{message}</div>
      {ctaHref && ctaLabel ? (
        <Link className="ecosystem-empty-carousel__cta" to={ctaHref}>
          {ctaLabel}
        </Link>
      ) : null}
    </div>
  )
}
