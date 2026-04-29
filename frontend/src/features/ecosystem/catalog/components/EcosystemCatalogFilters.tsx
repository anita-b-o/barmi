import Input from '@/components/primitives/Input'
import SelectField from '@/components/primitives/Select'
import Button from '@/components/primitives/Button'
import { alpha, theme } from '@/app/theme'
import type { PublicEcosystemCatalogSort } from '../../../../api/contracts/v1/public'

type EcosystemCatalogFiltersProps = {
  query: string
  sort: PublicEcosystemCatalogSort
  deliverySupportedOnly: boolean
  onQueryChange: (value: string) => void
  onSortChange: (value: PublicEcosystemCatalogSort) => void
  onDeliverySupportedOnlyChange: (value: boolean) => void
  onClose?: () => void
}

const SORT_OPTIONS: Array<{ value: PublicEcosystemCatalogSort; label: string }> = [
  { value: 'default', label: 'Orden actual' },
  { value: 'name,asc', label: 'Nombre A-Z' },
  { value: 'name,desc', label: 'Nombre Z-A' },
  { value: 'price,asc', label: 'Precio menor' },
  { value: 'price,desc', label: 'Precio mayor' }
]

export function EcosystemCatalogFilters({
  query,
  sort,
  deliverySupportedOnly,
  onQueryChange,
  onSortChange,
  onDeliverySupportedOnlyChange,
  onClose
}: EcosystemCatalogFiltersProps) {
  return (
    <div
      style={{
        display: 'grid',
        gap: theme.spacing.lg,
        padding: theme.spacing.xl,
        borderRadius: theme.radius.lg,
        border: `1px solid ${theme.colors.borderDefault}`,
        background: theme.colors.bgSurfaceAlt,
        boxShadow: 'none'
      }}
    >
      <div style={{ display: 'grid', gap: 4 }}>
        <div style={{ fontSize: theme.typography.title.size, fontWeight: 700, letterSpacing: 0, color: theme.colors.textPrimary }}>
          Filtros
        </div>
        <div style={{ color: theme.colors.textMuted, lineHeight: 1.5 }}>
          Refiná resultados con los filtros disponibles para este catálogo público.
        </div>
      </div>

      <div style={{ display: 'grid', gap: theme.spacing.lg }}>
        <div style={{ display: 'grid', gap: theme.spacing.sm }}>
          <label
            htmlFor="ecosystem-catalog-search"
            style={{ fontSize: theme.typography.small.size, fontWeight: 700, color: theme.colors.textPrimary, letterSpacing: 0, textTransform: 'uppercase' }}
          >
            Buscar
          </label>
          <Input
            id="ecosystem-catalog-search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Buscar productos externos"
            aria-label="Buscar productos ecosystem"
            style={{ background: theme.colors.bgSurfaceAlt }}
          />
        </div>

        <div style={{ display: 'grid', gap: theme.spacing.sm }}>
          <div style={{ fontSize: theme.typography.small.size, fontWeight: 700, color: theme.colors.textPrimary, letterSpacing: 0, textTransform: 'uppercase' }}>
            Tipo
          </div>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing.md,
              padding: '10px 12px',
              borderRadius: theme.radius.md,
              border: `1px solid ${alpha(theme.colors.actionPrimary, 0.18)}`,
              background: alpha(theme.colors.brand, 0.12),
              color: theme.colors.textPrimary,
              fontWeight: 600
            }}
          >
            <input type="checkbox" checked readOnly aria-label="Tipo producto activo" style={{ accentColor: theme.colors.actionPrimary }} />
            Productos externos
          </label>
          <div style={{ color: theme.colors.textMuted, fontSize: theme.typography.small.size, lineHeight: 1.5 }}>
            Este catálogo público sólo lista productos externos del ecosystem. Las tiendas se exploran desde el mapa.
          </div>
        </div>

        <div style={{ display: 'grid', gap: theme.spacing.sm }}>
          <div style={{ fontSize: theme.typography.small.size, fontWeight: 700, color: theme.colors.textPrimary, letterSpacing: 0, textTransform: 'uppercase' }}>
            Entrega
          </div>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing.md,
              minHeight: 44,
              padding: '10px 12px',
              borderRadius: theme.radius.md,
              border: `1px solid ${deliverySupportedOnly ? alpha(theme.colors.actionPrimary, 0.24) : theme.colors.borderDefault}`,
              background: deliverySupportedOnly ? alpha(theme.colors.brand, 0.14) : theme.colors.bgSurfaceAlt,
              color: theme.colors.textPrimary,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <input
              type="checkbox"
              checked={deliverySupportedOnly}
              onChange={(event) => onDeliverySupportedOnlyChange(event.target.checked)}
              aria-label="Solo con entrega"
              style={{ accentColor: theme.colors.actionPrimary }}
            />
            Solo con entrega
          </label>
        </div>

        <div style={{ display: 'grid', gap: theme.spacing.sm }}>
          <label
            htmlFor="ecosystem-catalog-sort"
            style={{ fontSize: theme.typography.small.size, fontWeight: 700, color: theme.colors.textPrimary, letterSpacing: 0, textTransform: 'uppercase' }}
          >
            Orden
          </label>
          <SelectField
            id="ecosystem-catalog-sort"
            value={sort}
            onChange={(event) => onSortChange(event.target.value as PublicEcosystemCatalogSort)}
            options={SORT_OPTIONS}
            aria-label="Ordenar productos ecosystem"
            style={{ background: theme.colors.bgSurfaceAlt }}
          />
        </div>
      </div>

      {onClose ? (
        <Button variant="secondary" onClick={onClose} style={{ width: '100%' }}>
          Ver resultados
        </Button>
      ) : null}
    </div>
  )
}
