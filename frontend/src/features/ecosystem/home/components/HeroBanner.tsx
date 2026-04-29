import type { HeroBannerItem } from '../config'

type HeroBannerProps = {
  items: HeroBannerItem[]
  activeIndex?: number
}

export function HeroBanner({ items, activeIndex = 0 }: HeroBannerProps) {
  const activeItem = items[activeIndex] ?? items[0] ?? null

  return (
    <div className="ecosystem-home-hero__banner" aria-label="Promociones destacadas">
      {activeItem ? (
        <img
          className="ecosystem-home-hero__banner-image"
          src={activeItem.src}
          alt={activeItem.alt}
        />
      ) : (
        <div className="ecosystem-home-hero__banner-fallback" aria-hidden="true" />
      )}
    </div>
  )
}
