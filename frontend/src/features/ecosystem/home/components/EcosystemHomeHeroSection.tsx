import { Link } from 'react-router-dom'
import Button from '@/components/primitives/Button'
import { routes } from '@/core/constants/routes'
import { ecosystemHomeQuickAccessItems } from '../config'
import { QuickAccessIconGraphic } from './QuickAccessIcons'
import { SurfaceCard } from '../../components/SurfaceCard'
import '../../components/ecosystem-marketplace.css'

type EcosystemHomeHeroSectionProps = {
  storeCount: number
  productCount: number
  categoryCount: number
}

export function EcosystemHomeHeroSection({
  storeCount,
  productCount,
  categoryCount
}: EcosystemHomeHeroSectionProps) {
  return (
    <section className="ecosystem-home-hero" aria-label="Inicio del ecosystem">
      <SurfaceCard variant="inverse" className="ecosystem-home-hero__lead">
        <div className="ecosystem-home-hero__copy">
          <span className="ecosystem-home-hero__eyebrow">Marketplace ecosystem</span>
          <h1>Barmi reúne tiendas, productos y compra guiada en un solo lugar</h1>
          <p>
            Primero descubrís en el ecosystem. Después entrás a una tienda o seguís por catálogo. Si comprás en una store, el carrito queda separado para que el contexto no se mezcle.
          </p>
          <div style={{ display: 'grid', gap: 8, color: 'var(--barmi-color-text-muted)', lineHeight: 1.5 }}>
            <div><strong style={{ color: 'var(--barmi-color-text-primary)' }}>1.</strong> Buscá por mapa, tienda o producto.</div>
            <div><strong style={{ color: 'var(--barmi-color-text-primary)' }}>2.</strong> Elegí si querés comprar dentro del marketplace o dentro de una tienda puntual.</div>
            <div><strong style={{ color: 'var(--barmi-color-text-primary)' }}>3.</strong> Terminá checkout con contexto claro y seguimiento posterior.</div>
          </div>
          <div className="ecosystem-home-hero__metrics" aria-label="Métricas del ecosystem">
            <div className="ecosystem-home-hero__metric">
              <strong>{storeCount}</strong>
              <span>tiendas activas</span>
            </div>
            <div className="ecosystem-home-hero__metric">
              <strong>{productCount}</strong>
              <span>productos publicados</span>
            </div>
            <div className="ecosystem-home-hero__metric">
              <strong>{categoryCount}</strong>
              <span>categorías</span>
            </div>
          </div>
          <div className="ecosystem-home-hero__actions">
            <Link to={routes.ecosystemStoresMap} style={{ textDecoration: 'none' }}>
              <Button variant="primary">Explorar tiendas en mapa</Button>
            </Link>
            <Link to={routes.ecosystemCatalog} style={{ textDecoration: 'none' }}>
              <Button variant="secondary">Buscar productos</Button>
            </Link>
          </div>
        </div>
        <div className="ecosystem-home-hero__illustration" aria-hidden="true">
          <div className="ecosystem-home-hero__preview-card ecosystem-home-hero__preview-card--map">
            <div className="ecosystem-home-hero__preview-label">Mapa local</div>
            <div className="ecosystem-home-hero__mini-map">
              <div className="ecosystem-home-hero__mini-map-grid" />
              <span className="ecosystem-home-hero__mini-map-pin" style={{ left: '18%', top: '58%' }} />
              <span className="ecosystem-home-hero__mini-map-pin" style={{ left: '34%', top: '24%' }} />
              <span className="ecosystem-home-hero__mini-map-pin" style={{ left: '54%', top: '44%' }} />
              <span className="ecosystem-home-hero__mini-map-pin" style={{ left: '74%', top: '30%' }} />
            </div>
          </div>

          <div className="ecosystem-home-hero__preview-card ecosystem-home-hero__preview-card--store">
            <div className="ecosystem-home-hero__preview-badge">Destacadas</div>
            <strong>Tiendas con ubicación, catálogo y acceso directo</strong>
            <span>Entrás por discovery y seguís comprando sin perder contexto.</span>
          </div>

          <div className="ecosystem-home-hero__preview-card ecosystem-home-hero__preview-card--product">
            <div className="ecosystem-home-hero__preview-price">Comprá mejor</div>
            <strong>Productos, mapa y categorías</strong>
            <span>Si no encontrás algo por nombre, probá abrir una tienda desde el mapa.</span>
          </div>
        </div>
      </SurfaceCard>

      <div className="ecosystem-home-quick" aria-label="Accesos rápidos">
        {ecosystemHomeQuickAccessItems.map((item) => (
          <SurfaceCard key={item.id} variant="interactive" className="ecosystem-home-quick__card">
            <Link to={item.href} style={{ textDecoration: 'none', color: 'inherit', display: 'grid', gap: 12 }}>
              <div className="ecosystem-home-quick__icon">
                <QuickAccessIconGraphic icon={item.icon} />
              </div>
              <div className="ecosystem-home-quick__content">
                <h2 className="ecosystem-home-quick__title">{item.title}</h2>
                <p className="ecosystem-home-quick__description">{item.description}</p>
              </div>
              <span className="ecosystem-home-quick__cta">{item.ctaLabel}</span>
            </Link>
          </SurfaceCard>
        ))}
      </div>

      <SurfaceCard variant="inverse" className="ecosystem-home-map-callout">
        <div className="ecosystem-home-map-callout__copy">
          <div className="ecosystem-stack" style={{ gap: 8 }}>
            <h2 className="ecosystem-home-map-callout__title">El mapa es la forma más simple de empezar si sos nuevo</h2>
            <p className="ecosystem-home-map-callout__description">
              Navegá tiendas por zona, categoría y resultados sincronizados con pins reales. Si no sabés si buscar producto o tienda, arrancá acá.
            </p>
          </div>
          <p className="ecosystem-home-map-callout__meta">Mapa real, sidebar compacta y selección alineada entre lista y vista geográfica para pasar de discovery a compra más rápido.</p>
          <div>
            <Link to={routes.ecosystemStoresMap} style={{ textDecoration: 'none' }}>
              <Button variant="primary">Abrir mapa</Button>
            </Link>
          </div>
        </div>
        <div className="ecosystem-home-map-callout__preview" aria-hidden="true">
          <div className="ecosystem-home-map-callout__grid" />
          <span className="ecosystem-home-map-callout__pin" style={{ left: '18%', top: '64%' }} />
          <span className="ecosystem-home-map-callout__pin" style={{ left: '32%', top: '34%' }} />
          <span className="ecosystem-home-map-callout__pin" style={{ left: '58%', top: '44%' }} />
          <span className="ecosystem-home-map-callout__pin" style={{ left: '72%', top: '26%' }} />
          <span className="ecosystem-home-map-callout__pin" style={{ left: '78%', top: '68%' }} />
        </div>
      </SurfaceCard>
    </section>
  )
}
