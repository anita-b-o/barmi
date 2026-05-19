import { memo } from 'react'
import { Link } from 'react-router-dom'
import Badge from '@/components/primitives/Badge'
import type { StoreRailProductPreview } from '../home/storeRails'
import { SurfaceCard } from './SurfaceCard'
import { appConfig } from '@/app/config/env'
import { trackBetaEvent } from '@/features/beta'

type StoreCardData = {
  id: string
  name: string
  storeHref: string
  storeProductsHref?: string
  logoUrl?: string | null
  categoryLabel?: string | null
  locationLabel?: string | null
  hasPublicLocation?: boolean
  featuredProducts?: StoreRailProductPreview[]
}

type StoreCardProps = {
  store: StoreCardData
  layout?: 'rail' | 'list'
  selected?: boolean
  onSelect?: () => void
}

function StoreLogo({ name, logoUrl }: { name: string; logoUrl?: string | null }) {
  return (
    <div className="ecosystem-store-card__logo" aria-hidden={logoUrl ? undefined : 'true'}>
      {logoUrl ? (
        <img className="ecosystem-store-card__logo-image" src={logoUrl} alt={name} loading="lazy" decoding="async" />
      ) : (
        <span className="ecosystem-store-card__logo-fallback">{name.slice(0, 4).toUpperCase()}</span>
      )}
    </div>
  )
}

function StoreCardBase({
  store,
  layout = 'rail',
  selected = false,
  onSelect
}: StoreCardProps) {
  const previewProducts = store.featuredProducts ?? []
  const trackedStoreSlug = store.storeHref.split('/').filter(Boolean).at(-1)
  const trackClick = (surface: string) => {
    trackBetaEvent({
      eventName: 'store_click',
      ecosystemSlug: appConfig.publicEcosystemSlug,
      storeId: store.id,
      storeSlug: trackedStoreSlug,
      storeName: store.name,
      metadata: { surface }
    })
  }

  return (
    <SurfaceCard
      variant="interactive"
      selected={selected}
      className={`ecosystem-store-card ecosystem-store-card--${layout}${selected ? ' ecosystem-store-card--selected' : ''}`}
      onClick={onSelect}
      style={{ cursor: onSelect ? 'pointer' : 'default' }}
    >
      <Link
        className="ecosystem-store-card__main-link"
        to={store.storeHref}
        onClick={(event) => {
          event.stopPropagation()
          trackClick(`${layout}_logo`)
        }}
      >
        <StoreLogo name={store.name} logoUrl={store.logoUrl} />
      </Link>

      {previewProducts.length > 0 ? (
        <div className="ecosystem-store-card__preview-grid" aria-hidden="true">
          {previewProducts.slice(0, 3).map((product) => (
            <div key={product.id} className="ecosystem-store-card__preview-slot">
              {product.imageUrl ? (
                <img
                  className="ecosystem-store-card__preview-image"
                  src={product.imageUrl}
                  alt={product.alt}
                  loading="lazy"
                  decoding="async"
                />
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      <div className="ecosystem-store-card__meta">
        {store.categoryLabel ? <Badge variant="info">{store.categoryLabel}</Badge> : null}
        {store.hasPublicLocation !== undefined ? (
          <Badge variant={store.hasPublicLocation ? 'success' : 'neutral'}>
            {store.hasPublicLocation ? 'Con ubicación' : 'Sin mapa todavía'}
          </Badge>
        ) : null}
        {selected ? <Badge variant="warning">Seleccionada</Badge> : null}
      </div>

      <div className="ecosystem-stack" style={{ gap: 6 }}>
        {layout === 'list' && onSelect ? (
          <button
            className="ecosystem-store-card__select"
            type="button"
            aria-pressed={selected}
            onClick={(event) => {
              event.stopPropagation()
              onSelect()
            }}
          >
            <h3 className="ecosystem-store-card__title">{store.name}</h3>
          </button>
        ) : (
          <Link
            className="ecosystem-store-card__main-link"
            to={store.storeHref}
            onClick={(event) => {
              event.stopPropagation()
              trackClick(`${layout}_title`)
            }}
          >
            <h3 className="ecosystem-store-card__title">{store.name}</h3>
          </Link>
        )}
        <p className="ecosystem-store-card__details">
          {store.locationLabel ?? (layout === 'rail' ? 'Descubrila dentro del ecosystem' : 'Sin etiqueta de ubicación pública')}
        </p>
      </div>

      {layout === 'list' ? (
        <div className="ecosystem-store-card__actions">
          {onSelect ? (
            <button
              className="ecosystem-store-card__ghost"
              type="button"
              aria-pressed={selected}
              onClick={(event) => {
                event.stopPropagation()
                onSelect()
              }}
            >
              {store.hasPublicLocation ? 'Ver en mapa' : 'Ver detalle'}
            </button>
          ) : null}
          <Link
            className="ecosystem-store-card__button"
            to={store.storeHref}
            onClick={(event) => {
              event.stopPropagation()
              trackClick(`${layout}_cta`)
            }}
          >
            Ver tienda
          </Link>
        </div>
      ) : null}
    </SurfaceCard>
  )
}

export const StoreCard = memo(StoreCardBase)
