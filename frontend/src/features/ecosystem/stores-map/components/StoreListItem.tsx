import { Link } from 'react-router-dom'
import Card from '@/components/primitives/Card'
import Badge from '@/components/primitives/Badge'
import Button from '@/components/primitives/Button'
import { alpha, theme } from '@/app/theme'
import { routes } from '@/core/constants/routes'
import type { PublicStoreMapStore } from '../../../../api/contracts/v1/public'

type StoreListItemProps = {
  store: PublicStoreMapStore
  isSelected: boolean
  distanceLabel?: string | null
  onSelect: () => void
}

export function StoreListItem({ store, isSelected, distanceLabel, onSelect }: StoreListItemProps) {
  return (
    <Card
      variant={isSelected ? 'soft' : 'surface'}
      style={{
        cursor: 'pointer',
        padding: theme.spacing.lg,
        borderColor: isSelected ? alpha(theme.colors.primary, 0.24) : undefined,
        background: isSelected ? theme.colors.bgSurfaceAlt : undefined,
        transition: 'none',
        boxShadow: 'none'
      }}
      onClick={onSelect}
    >
      <div style={{ display: 'grid', gap: theme.spacing.md }}>
        <div
          aria-hidden="true"
          style={{
            minHeight: 88,
            borderRadius: theme.radius.md,
            border: `1px solid ${alpha(theme.colors.primary, 0.14)}`,
            background: theme.colors.bgSurfaceAlt,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: theme.colors.primary,
            fontWeight: 700,
            letterSpacing: 0,
            textTransform: 'uppercase'
          }}
        >
          Storefront
        </div>

        <div style={{ display: 'flex', gap: theme.spacing.sm, flexWrap: 'wrap', alignItems: 'center' }}>
          {store.category ? <Badge variant="info">{store.category.label}</Badge> : null}
          <Badge variant={store.hasPublicLocation ? 'success' : 'neutral'}>
            {store.hasPublicLocation ? 'Con ubicación' : 'Sin mapa todavía'}
          </Badge>
          {distanceLabel ? <Badge variant="neutral">{distanceLabel}</Badge> : null}
          {isSelected ? <Badge variant="info">Seleccionada</Badge> : null}
        </div>

        <div style={{ display: 'grid', gap: 6 }}>
          <div style={{ fontWeight: 700, fontSize: 18, letterSpacing: 0, overflowWrap: 'anywhere' }}>{store.name}</div>
          <div style={{ color: theme.colors.textMuted, lineHeight: 1.6 }}>
            {store.locationLabel ?? 'Sin etiqueta de ubicación pública'}
          </div>
          {store.category ? (
            <div style={{ color: theme.colors.textMuted, fontSize: theme.typography.small.size }}>
              Rubro: {store.category.label}
            </div>
          ) : null}
          <div style={{ color: theme.colors.textMuted, fontSize: theme.typography.small.size, lineHeight: 1.5 }}>
            Desde acá vas al storefront público de la tienda para ver sus productos propios y usar su carrito independiente.
          </div>
        </div>

        <div style={{ display: 'flex', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
          <Button
            type="button"
            variant="secondary"
            onClick={(event) => {
              event.stopPropagation()
              onSelect()
            }}
          >
            {store.hasPublicLocation ? 'Ver en mapa' : 'Ver detalle'}
          </Button>
          <Link
            to={routes.publicStore(store.slug)}
            style={{ textDecoration: 'none', maxWidth: '100%' }}
            onClick={(event) => event.stopPropagation()}
          >
            <Button variant="primary">Ver tienda</Button>
          </Link>
        </div>
      </div>
    </Card>
  )
}
