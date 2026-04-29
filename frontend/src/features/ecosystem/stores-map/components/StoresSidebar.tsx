import Input from '@/components/primitives/Input'
import Select from '@/components/primitives/Select'
import Button from '@/components/primitives/Button'
import Badge from '@/components/primitives/Badge'
import Card from '@/components/primitives/Card'
import EmptyState from '@/components/feedback/EmptyState'
import ErrorState from '@/components/feedback/ErrorState'
import LoadingState from '@/components/feedback/LoadingState'
import { alpha, theme } from '@/app/theme'
import type { PublicStoreCategoryFacet, PublicStoreMapStore } from '../../../../api/contracts/v1/public'
import { StoreListItem } from './StoreListItem'

type StoresSidebarProps = {
  isMobile: boolean
  query: string
  category: string
  location: 'mapped' | 'all'
  nearMode: boolean
  nearStatus: 'idle' | 'loading' | 'ready' | 'unsupported' | 'denied' | 'error'
  categories: PublicStoreCategoryFacet[]
  stores: PublicStoreMapStore[]
  selectedStoreId: string | null
  distanceLabels: Record<string, string>
  isLoading: boolean
  error: string | null
  activeFiltersCount: number
  onQueryChange: (value: string) => void
  onCategoryChange: (value: string) => void
  onLocationChange: (value: 'mapped' | 'all') => void
  onToggleNear: () => void
  onClearFilters: () => void
  onSelectStore: (storeId: string) => void
}

export function StoresSidebar({
  isMobile,
  query,
  category,
  location,
  nearMode,
  nearStatus,
  categories,
  stores,
  selectedStoreId,
  distanceLabels,
  isLoading,
  error,
  activeFiltersCount,
  onQueryChange,
  onCategoryChange,
  onLocationChange,
  onToggleNear,
  onClearFilters,
  onSelectStore
}: StoresSidebarProps) {
  const nearStatusLabel = nearMode
    ? 'Cercanía activa'
    : nearStatus === 'loading'
      ? 'Buscando ubicación...'
      : nearStatus === 'ready'
        ? 'Cerca mío disponible'
        : 'Cerca mío'

  const nearStatusMessage = nearStatus === 'unsupported'
    ? 'Tu navegador no expone geolocalización.'
    : nearStatus === 'denied'
      ? 'No pudimos acceder a tu ubicación.'
      : nearStatus === 'error'
        ? 'No se pudo calcular cercanía.'
        : nearMode
          ? 'Las tiendas con coordenadas se priorizan por distancia estimada.'
          : 'Podés activar cercanía si tu navegador permite geolocalización.'

  return (
    <Card
      style={{
        padding: theme.spacing.xl,
        display: 'grid',
        gap: theme.spacing.lg,
        position: isMobile ? 'static' : 'sticky',
        top: isMobile ? undefined : theme.spacing.lg,
        maxHeight: isMobile ? undefined : '78vh',
        minWidth: 0,
        borderColor: theme.colors.borderDefault
      }}
    >
      <div style={{ display: 'grid', gap: theme.spacing.md }}>
        <div style={{ display: 'grid', gap: 6 }}>
          <div style={{ fontSize: theme.typography.title.size, fontWeight: 700, color: theme.colors.textPrimary }}>
            Descubrir tiendas
          </div>
          <div style={{ color: theme.colors.textMuted, lineHeight: 1.5 }}>
            Buscá por nombre, filtrá por rubro y recorré el mapa junto al listado en una sola experiencia.
          </div>
        </div>

        <Input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Buscar tiendas"
          aria-label="Buscar tiendas en mapa"
          style={{ background: theme.colors.bgSurfaceAlt }}
        />

        <div style={{ display: 'grid', gap: theme.spacing.md }}>
          <Select
            aria-label="Filtrar tiendas por rubro"
            value={category}
            onChange={(event) => onCategoryChange(event.target.value)}
            options={[
              { value: '', label: 'Todos los rubros' },
              ...categories.map((item) => ({ value: item.key, label: `${item.label} (${item.storeCount})` }))
            ]}
          />
          <Select
            aria-label="Filtrar tiendas por ubicación"
            value={location}
            onChange={(event) => onLocationChange(event.target.value === 'all' ? 'all' : 'mapped')}
            options={[
              { value: 'mapped', label: 'Sólo con ubicación en mapa' },
              { value: 'all', label: 'Todas las tiendas' }
            ]}
          />
          <div style={{ display: 'grid', gap: theme.spacing.sm, gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))' }}>
            <Button
              type="button"
              variant={nearMode ? 'primary' : 'secondary'}
              onClick={onToggleNear}
              disabled={nearStatus === 'loading'}
              style={{ width: '100%' }}
            >
              {nearStatusLabel}
            </Button>
            <Button type="button" variant="ghost" onClick={onClearFilters} disabled={activeFiltersCount === 0} style={{ width: '100%' }}>
              Limpiar filtros
            </Button>
          </div>
          <div
            style={{
              padding: theme.spacing.md,
              borderRadius: theme.radius.md,
              border: `1px solid ${theme.colors.borderDefault}`,
              background: theme.colors.bgSurfaceAlt,
              color: theme.colors.textMuted,
              lineHeight: 1.5
            }}
          >
            {nearStatusMessage}
          </div>
        </div>

        <div style={{ display: 'flex', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
          <Badge variant="neutral">{stores.length} visibles</Badge>
          <Badge variant="neutral">Filtros activos: {activeFiltersCount}</Badge>
          <Badge variant="neutral">Clasificación pública: una categoría principal por store</Badge>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gap: theme.spacing.md,
          overflowY: isMobile ? 'visible' : 'auto',
          paddingRight: isMobile ? 0 : 4
        }}
      >
        {isLoading ? (
          <LoadingState label="Cargando tiendas en mapa..." />
        ) : error ? (
          <ErrorState message={error} />
        ) : stores.length === 0 ? (
          <EmptyState
            title="No encontramos tiendas con esos filtros"
            description="Probá cambiar el nombre, el rubro o la visibilidad de ubicación para volver a explorar el ecosystem."
          />
        ) : (
          stores.map((store) => (
            <div
              key={store.id}
              id={`ecosystem-store-item-${store.id}`}
              style={{
                outline: selectedStoreId === store.id ? `2px solid ${alpha(theme.colors.actionPrimary, 0.18)}` : 'none',
                outlineOffset: 2,
                borderRadius: theme.radius.lg
              }}
            >
              <StoreListItem
                store={store}
                isSelected={selectedStoreId === store.id}
                distanceLabel={distanceLabels[store.id] ?? null}
                onSelect={() => onSelectStore(store.id)}
              />
            </div>
          ))
        )}
      </div>
    </Card>
  )
}
