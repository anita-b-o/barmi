import { Link } from 'react-router-dom'
import Card from '@/components/primitives/Card'
import Badge from '@/components/primitives/Badge'
import Button from '@/components/primitives/Button'
import EmptyState from '@/components/feedback/EmptyState'
import { alpha, theme } from '@/app/theme'
import { useViewportMode } from '@/core/hooks/useViewportMode'
import { routes } from '@/core/constants/routes'
import type { PublicStoreMapStore } from '../../../../api/contracts/v1/public'

type StoresMapProps = {
  stores: PublicStoreMapStore[]
  selectedStoreId: string | null
  onSelectStore: (storeId: string) => void
}

type MapStorePoint = {
  store: PublicStoreMapStore
  x: number
  y: number
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function buildPoints(stores: PublicStoreMapStore[], selectedStoreId: string | null): MapStorePoint[] {
  const mappedStores = stores.filter((store) => store.hasPublicLocation && store.latitude !== null && store.longitude !== null)
  if (mappedStores.length === 0) return []

  const latitudes = mappedStores.map((store) => store.latitude as number)
  const longitudes = mappedStores.map((store) => store.longitude as number)
  const minLat = Math.min(...latitudes)
  const maxLat = Math.max(...latitudes)
  const minLng = Math.min(...longitudes)
  const maxLng = Math.max(...longitudes)
  const latSpan = Math.max(maxLat - minLat, 0.02)
  const lngSpan = Math.max(maxLng - minLng, 0.02)

  const selectedMappedStore = mappedStores.find((store) => store.id === selectedStoreId) ?? null
  const focusLng = selectedMappedStore?.longitude ?? null
  const focusLat = selectedMappedStore?.latitude ?? null
  const focusLngSpan = selectedMappedStore ? Math.max(lngSpan * 0.48, 0.02) : lngSpan
  const focusLatSpan = selectedMappedStore ? Math.max(latSpan * 0.48, 0.02) : latSpan
  const viewMinLng = focusLng !== null ? clamp(focusLng - focusLngSpan / 2, minLng, maxLng - focusLngSpan) : minLng
  const viewMaxLng = focusLng !== null ? clamp(focusLng + focusLngSpan / 2, minLng + focusLngSpan, maxLng) : maxLng
  const viewMinLat = focusLat !== null ? clamp(focusLat - focusLatSpan / 2, minLat, maxLat - focusLatSpan) : minLat
  const viewMaxLat = focusLat !== null ? clamp(focusLat + focusLatSpan / 2, minLat + focusLatSpan, maxLat) : maxLat
  const normalizedLatSpan = Math.max(viewMaxLat - viewMinLat, 0.02)
  const normalizedLngSpan = Math.max(viewMaxLng - viewMinLng, 0.02)

  return mappedStores.map((store) => ({
    store,
    x: 10 + ((((store.longitude as number) - viewMinLng) / normalizedLngSpan) * 80),
    y: 12 + (1 - ((((store.latitude as number) - viewMinLat) / normalizedLatSpan))) * 76
  }))
}

export function StoresMap({ stores, selectedStoreId, onSelectStore }: StoresMapProps) {
  const viewportMode = useViewportMode()
  const isMobile = viewportMode === 'mobile'
  const points = buildPoints(stores, selectedStoreId)
  const selectedStore = stores.find((store) => store.id === selectedStoreId) ?? stores[0] ?? null
  const selectedPoint = points.find((point) => point.store.id === selectedStore?.id) ?? null

  return (
    <Card
      style={{
        display: 'grid',
        gap: theme.spacing.lg,
        padding: isMobile ? theme.spacing.xl : theme.spacing.xxl,
        minHeight: isMobile ? 0 : 640,
        minWidth: 0
      }}
    >
      <div style={{ display: 'grid', gap: 6 }}>
        <div style={{ fontSize: theme.typography.title.size, fontWeight: 700, color: theme.colors.textPrimary }}>
          Mapa de tiendas
        </div>
        <div style={{ color: theme.colors.textMuted, lineHeight: 1.6 }}>
          Vista geográfica basada en coordenadas públicas del ecosystem. Seleccioná una tienda para centrarla y abrir su ficha rápida.
        </div>
      </div>

      {points.length === 0 ? (
        <EmptyState
          title="No hay tiendas ubicables para mostrar en el mapa"
          description="Podés seguir explorando el listado: algunas stores del ecosystem todavía no cargaron coordenadas públicas."
        />
      ) : (
        <>
          <div
            style={{
              position: 'relative',
              minHeight: 500,
              borderRadius: theme.radius.lg,
              overflow: 'hidden',
              border: `1px solid ${theme.colors.borderAccentSoft}`,
              background: theme.colors.bgSurfaceAlt
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: 'none',
                backgroundSize: '88px 88px, 88px 88px'
              }}
            />

            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                inset: '10% 12%',
                borderRadius: theme.radius.lg,
                background: theme.colors.bgSurfaceAlt
              }}
            />

            {points.map((point, index) => {
              const isSelected = point.store.id === selectedStore?.id

              return (
                <button
                  key={point.store.id}
                  type="button"
                  onClick={() => onSelectStore(point.store.id)}
                  aria-label={`Ver tienda ${point.store.name} en el mapa`}
                  style={{
                    position: 'absolute',
                    left: `${point.x}%`,
                    top: `${point.y}%`,
                    transform: 'translate(-50%, -100%)',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  <div
                    style={{
                      display: 'grid',
                      gap: 6,
                      justifyItems: 'center'
                    }}
                  >
                    <div
                      style={{
                        width: isSelected ? 24 : 20,
                        height: isSelected ? 24 : 20,
                        borderRadius: theme.radius.pill,
                        background: isSelected ? theme.colors.brand : theme.colors.actionPrimary,
                        border: `3px solid ${theme.colors.bgSurfaceAlt}`,
                        boxShadow: 'none',
                        display: 'grid',
                        placeItems: 'center',
                        color: theme.colors.bgSurfaceAlt,
                        fontSize: 11,
                        fontWeight: 800
                      }}
                    >
                      {index + 1}
                    </div>
                    {isSelected ? (
                      <div
                        style={{
                          padding: '4px 8px',
                          borderRadius: theme.radius.pill,
                          background: theme.colors.textPrimary,
                          color: theme.colors.bgSurfaceAlt,
                          fontSize: theme.typography.small.size,
                          whiteSpace: 'nowrap',
                          maxWidth: 180,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {point.store.name}
                      </div>
                    ) : null}
                  </div>
                </button>
              )
            })}

            {selectedStore && selectedPoint ? (
              <div
                style={{
                  position: 'absolute',
                  left: clamp(selectedPoint.x + (isMobile ? 0 : 4), isMobile ? 50 : 18, isMobile ? 50 : 78) + '%',
                  top: clamp(selectedPoint.y + (isMobile ? 16 : 2), isMobile ? 80 : 18, isMobile ? 82 : 78) + '%',
                  transform: isMobile ? 'translate(-50%, 0)' : 'translate(-10%, 0)',
                  width: isMobile ? 'calc(100% - 24px)' : 280,
                  maxWidth: 'calc(100% - 32px)',
                  padding: theme.spacing.lg,
                  borderRadius: theme.radius.lg,
                  border: `1px solid ${theme.colors.borderAccentSoft}`,
                  background: theme.colors.bgSurfaceAlt,
                  boxShadow: 'none'
                }}
              >
                <div style={{ display: 'grid', gap: theme.spacing.md }}>
                  <div style={{ display: 'flex', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
                    {selectedStore.category ? <Badge variant="info">{selectedStore.category.label}</Badge> : null}
                    <Badge variant="success">Ubicación pública visible</Badge>
                  </div>
                  <div style={{ display: 'grid', gap: 4 }}>
                    <div style={{ fontWeight: 700, fontSize: 18, letterSpacing: 0, overflowWrap: 'anywhere' }}>{selectedStore.name}</div>
                    <div style={{ color: theme.colors.textMuted, lineHeight: 1.5 }}>
                      {selectedStore.locationLabel ?? 'Ubicación pública cargada'}
                    </div>
                    <div style={{ color: theme.colors.textMuted, fontSize: theme.typography.small.size, lineHeight: 1.5 }}>
                      Ubicación aproximada en base a coordenadas públicas del ecosystem.
                    </div>
                  </div>
                  <Link to={routes.publicStore(selectedStore.slug)} style={{ textDecoration: 'none' }}>
                    <Button variant="primary" style={{ width: '100%' }}>Ver tienda</Button>
                  </Link>
                </div>
              </div>
            ) : null}
          </div>

          {selectedStore && !selectedStore.hasPublicLocation ? (
            <div
              style={{
                padding: theme.spacing.lg,
                borderRadius: theme.radius.lg,
                border: `1px solid ${alpha(theme.colors.warning, 0.28)}`,
                background: theme.colors.bgSurfaceAlt
              }}
            >
              <div style={{ display: 'flex', gap: theme.spacing.sm, flexWrap: 'wrap', marginBottom: theme.spacing.sm }}>
                <Badge variant="neutral">Visible sólo en listado</Badge>
                {selectedStore.category ? <Badge variant="info">{selectedStore.category.label}</Badge> : null}
              </div>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>{selectedStore.name}</div>
              <div style={{ color: theme.colors.textMuted, lineHeight: 1.6 }}>
                La tienda existe en el ecosystem, pero todavía no aparece en el mapa por falta de coordenadas públicas.
              </div>
            </div>
          ) : null}
        </>
      )}
    </Card>
  )
}
