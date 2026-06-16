import { useCallback, useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { storeAdminAdapter } from '../../../../api/adapters/storeAdminAdapter'
import type { StoreShippingZone, StoreShippingZoneCreateReq, StoreShippingZoneType } from '../../../../api/contracts/v1/storeAdmin'
import { isApiError } from '../../../../api/client/errors'
import { useAuth } from '@/core/auth/authContext'
import AdminLayout from '@/layouts/AdminLayout'
import PageHeader from '@/components/navigation/SectionHeader'
import Section from '@/components/ui/Section'
import Card from '@/components/primitives/Card'
import Button from '@/components/primitives/Button'
import DataTable from '@/components/primitives/Table'
import Badge from '@/components/primitives/Badge'
import ConfirmDialog from '@/components/primitives/Modal/ConfirmDialog'
import ErrorAlert from '@/components/feedback/ErrorState'
import LoadingBlock from '@/components/feedback/LoadingState'
import EmptyState from '@/components/feedback/EmptyState'
import ToastContainer from '@/components/feedback/ToastContainer'
import FormField from '@/components/forms/Field'
import TextInput from '@/components/primitives/Input'
import SelectField from '@/components/primitives/Select'
import { Breadcrumbs, ContextHeader } from '@/components/navigation'
import { routes } from '@/core/constants/routes'
import { theme } from '@/app/theme'

function toErrorMessage(error: unknown): string {
  if (isApiError(error)) return error.message
  if (error instanceof Error) return error.message
  return 'Error inesperado'
}

type ZoneFormState = {
  type: StoreShippingZoneType
  postalCode: string
  rangeStart: string
  rangeEnd: string
  costAmount: string
  currency: string
}

const initialForm: ZoneFormState = {
  type: 'EXACT',
  postalCode: '',
  rangeStart: '',
  rangeEnd: '',
  costAmount: '',
  currency: 'ARS'
}

const actionGroupLayout: CSSProperties = {
  display: 'flex',
  gap: 8,
  flexWrap: 'wrap'
}

const stackLayout: CSSProperties = {
  display: 'grid',
  gap: 12
}

const formLayout: CSSProperties = {
  display: 'grid',
  gap: 16
}

const formGridLayout: CSSProperties = {
  display: 'grid',
  gap: 12,
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))'
}

const filterGridLayout: CSSProperties = {
  display: 'grid',
  gap: 16,
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))'
}

const shippingZoneTypeOptions = [
  { value: 'EXACT', label: 'Un código postal' },
  { value: 'RANGE', label: 'Rango de códigos postales' }
]

const zoneFilterOptions = [
  { value: 'ALL', label: 'Todos' },
  ...shippingZoneTypeOptions
]

type ToastItem = {
  id: string
  message: string
  variant?: 'success' | 'error' | 'info'
}

export default function AdminStoreScreen() {
  const { me, memberships, logout, authRequest } = useAuth()
  const activeStores = memberships.stores.filter((membership) => membership.status === 'ACTIVE')
  const [zones, setZones] = useState<StoreShippingZone[]>([])
  const [loadingZones, setLoadingZones] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<ZoneFormState>(initialForm)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const [typeFilter, setTypeFilter] = useState<'ALL' | StoreShippingZoneType>('ALL')
  const [query, setQuery] = useState('')
  const styles = useMemo(() => {
    const metaText: CSSProperties = {
      color: theme.colors.textMuted,
      fontSize: theme.typography.small.size,
      lineHeight: 1.45
    }
    const strongText: CSSProperties = {
      color: theme.colors.textPrimary,
      fontWeight: 700,
      lineHeight: 1.35
    }
    const secondaryText: CSSProperties = {
      color: theme.colors.textSecondary,
      lineHeight: 1.5
    }

    return {
      metaText,
      strongText,
      secondaryText,
      mutedCell: {
        ...metaText,
        overflowWrap: 'anywhere'
      } satisfies CSSProperties,
      membershipRow: {
        display: 'flex',
        justifyContent: 'space-between',
        gap: theme.spacing.lg,
        flexWrap: 'wrap',
        alignItems: 'center',
        padding: theme.spacing.md,
        border: `1px solid ${theme.colors.borderDefault}`,
        borderRadius: theme.radius.md,
        background: theme.colors.bgSurfaceAlt
      } satisfies CSSProperties,
      softPanel: {
        borderColor: theme.colors.borderStrong,
        background: theme.colors.bgHover
      } satisfies CSSProperties
    }
  }, [theme.mode])

  const addToast = (message: string, variant: ToastItem['variant'] = 'info') => {
    const id = `${Date.now()}-${Math.random()}`
    setToasts((prev) => [...prev, { id, message, variant }])
  }

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }

  const loadZones = useCallback(async () => {
    try {
      setLoadingZones(true)
      const data = await storeAdminAdapter.listZones(authRequest)
      setZones(data)
      setError(null)
    } catch (err) {
      setError(toErrorMessage(err))
    } finally {
      setLoadingZones(false)
    }
  }, [authRequest])

  useEffect(() => {
    loadZones()
  }, [loadZones])

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)

    const currency = form.currency.trim()
    const costAmount = Number(form.costAmount)
    if (Number.isNaN(costAmount)) {
      setError('El costo debe ser numérico')
      return
    }

    if (costAmount < 0) {
      setError('El costo no puede ser negativo')
      return
    }

    if (!currency) {
      setError('La moneda es requerida')
      return
    }

    let payload: StoreShippingZoneCreateReq

    if (form.type === 'EXACT') {
      if (!form.postalCode.trim()) {
        setError('El código postal es requerido')
        return
      }
      payload = {
        type: 'EXACT',
        postalCode: form.postalCode.trim(),
        costAmount,
        currency
      }
    } else {
      const rangeStart = Number(form.rangeStart)
      const rangeEnd = Number(form.rangeEnd)
      if (Number.isNaN(rangeStart) || Number.isNaN(rangeEnd)) {
        setError('El rango debe ser numérico')
        return
      }

      if (rangeStart > rangeEnd) {
        setError('El rango inicial no puede ser mayor al final')
        return
      }

      payload = {
        type: 'RANGE',
        rangeStart,
        rangeEnd,
        costAmount,
        currency
      }
    }

    try {
      setSaving(true)
      const created = await storeAdminAdapter.createZone(payload, authRequest)
      setZones((prev) => [...prev, created])
      setForm(initialForm)
      setError(null)
      addToast('Zona creada', 'success')
    } catch (err) {
      const message = toErrorMessage(err)
      setError(message)
      addToast(message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const onDelete = async (zoneId: string) => {
    try {
      setSaving(true)
      await storeAdminAdapter.deleteZone(zoneId, authRequest)
      setZones((prev) => prev.filter((zone) => zone.zoneId !== zoneId))
      addToast('Zona eliminada', 'success')
    } catch (err) {
      const message = toErrorMessage(err)
      setError(message)
      addToast(message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const sortedZones = useMemo(() => {
    return [...zones].sort((a, b) => {
      if (a.type !== b.type) return a.type === 'EXACT' ? -1 : 1
      if (a.type === 'EXACT') {
        return String(a.postalCode ?? '').localeCompare(String(b.postalCode ?? ''))
      }
      return (a.rangeStart ?? 0) - (b.rangeStart ?? 0)
    })
  }, [zones])

  const filteredZones = useMemo(() => {
    return sortedZones.filter((zone) => {
      if (typeFilter !== 'ALL' && zone.type !== typeFilter) return false
      const search = query.trim().toLowerCase()
      if (!search) return true
      const values = [
        zone.zoneId,
        zone.postalCode ?? '',
        zone.rangeStart?.toString() ?? '',
        zone.rangeEnd?.toString() ?? ''
      ]
      return values.some((value) => value.toLowerCase().includes(search))
    })
  }, [sortedZones, typeFilter, query])

  const hasActiveFilters = typeFilter !== 'ALL' || query.trim().length > 0

  const typeBadge = (type: StoreShippingZoneType) => {
    if (type === 'EXACT') {
      return <Badge variant="info">Código postal</Badge>
    }
    return <Badge variant="neutral">Rango</Badge>
  }

  const tableRows = filteredZones.map((zone) => ([
    <div key={`${zone.zoneId}-id`}>
      <div style={styles.strongText}>{zone.zoneId}</div>
      <div style={styles.mutedCell}>
        {zone.type === 'EXACT' ? `CP ${zone.postalCode ?? ''}` : `Rango ${zone.rangeStart ?? ''}-${zone.rangeEnd ?? ''}`}
      </div>
    </div>,
    <div key={`${zone.zoneId}-type`}>{typeBadge(zone.type)}</div>,
    <div key={`${zone.zoneId}-postal`} style={styles.secondaryText}>
      {zone.type === 'EXACT' ? zone.postalCode ?? '-' : `${zone.rangeStart ?? ''} - ${zone.rangeEnd ?? ''}`}
    </div>,
    <div key={`${zone.zoneId}-cost`} style={styles.secondaryText}>{zone.costAmount}</div>,
    <div key={`${zone.zoneId}-currency`} style={styles.secondaryText}>{zone.currency}</div>,
    <div key={`${zone.zoneId}-action`} style={actionGroupLayout}>
      <Button variant="ghost" onClick={() => setPendingDeleteId(zone.zoneId)} disabled={saving}>Eliminar</Button>
    </div>
  ]))

  return (
    <AdminLayout>
      <Breadcrumbs items={[{ label: 'Admin', href: routes.adminHome }, { label: 'Store', href: routes.adminStore }, { label: 'Zonas de envío' }]} />
      <PageHeader
        title="Zonas de envío STORE"
        subtitle={me?.email}
        actions={(
          <>
            <Link to={routes.adminStorePublish} style={{ color: theme.colors.textMuted, textDecoration: 'none' }}>Volver a publicar</Link>
            <Button variant="ghost" onClick={logout}>Cerrar sesión</Button>
          </>
        )}
      />

      <ContextHeader
        badge="Cobertura"
        title="Definí dónde entregás y cuánto cuesta"
        description="Creá una zona por código postal o por rango. Esta configuración se usa en checkout para calcular el total antes de confirmar la orden."
      />

      {error && (
        <div role="alert" aria-live="assertive" style={{ marginTop: theme.spacing.lg }}>
          <ErrorAlert message={error} actionLabel="Reintentar" onAction={() => void loadZones()} actionDisabled={loadingZones} />
        </div>
      )}

      <Section title="Stores activas">
        <Card>
          {activeStores.length === 0 && (
            <div role="status" aria-live="polite">
              <EmptyState title="No hay stores activas" />
            </div>
          )}
          {activeStores.length > 0 && (
            <div style={stackLayout}>
              {activeStores.map((store) => (
                <div key={store.storeId} style={styles.membershipRow}>
                  <div style={styles.strongText}>{store.storeSlug}</div>
                  <div style={styles.metaText}>{store.role}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </Section>

      <Section
        title="Filtros"
        action={(
          <Button
            variant="secondary"
            onClick={() => {
              setTypeFilter('ALL')
              setQuery('')
            }}
            disabled={!hasActiveFilters}
          >
            Limpiar filtros
          </Button>
        )}
      >
        <Card>
          <div style={filterGridLayout}>
            <FormField label="Tipo">
              <SelectField
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value as 'ALL' | StoreShippingZoneType)}
                options={zoneFilterOptions}
                aria-label="Tipo de zona"
              />
            </FormField>
            <FormField label="Buscar por código o rango">
              <TextInput
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="1900 / 1000-1999 / zoneId"
                aria-label="Buscar por código o rango"
                inputMode="numeric"
              />
            </FormField>
          </div>
        </Card>
      </Section>

      <Section title="Zonas de envío">
        {loadingZones && (
          <div role="status" aria-live="polite">
            <LoadingBlock label="Cargando zonas..." />
          </div>
        )}
        {!loadingZones && filteredZones.length === 0 && (
          <div role="status" aria-live="polite">
            <EmptyState
              title={hasActiveFilters ? 'No hay zonas que coincidan con los filtros' : 'No hay zonas configuradas'}
              description={hasActiveFilters ? 'Probá cambiando la búsqueda o el tipo.' : 'Creá al menos una zona para que una tienda online pueda cotizar envíos en checkout.'}
            />
          </div>
        )}
        {!loadingZones && filteredZones.length > 0 && (
          <DataTable
            headers={['Zona', 'Tipo', 'Postal/Rango', 'Costo', 'Moneda', 'Acciones']}
            rows={tableRows}
          />
        )}
      </Section>

      <Section title="Crear zona">
        <Card>
          <form onSubmit={onSubmit} style={formLayout}>
            <FormField label="Tipo">
              <SelectField
                value={form.type}
                onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value as StoreShippingZoneType }))}
                options={shippingZoneTypeOptions}
                aria-label="Tipo"
              />
            </FormField>

            <Card variant="soft" style={styles.softPanel}>
              {form.type === 'EXACT' ? (
                <FormField label="Código postal">
                  <TextInput
                    type="text"
                    value={form.postalCode}
                    onChange={(event) => setForm((prev) => ({ ...prev, postalCode: event.target.value }))}
                    placeholder="1234"
                    aria-label="Código postal"
                    inputMode="numeric"
                    required
                  />
                </FormField>
              ) : (
                <div style={formGridLayout}>
                  <FormField label="Rango inicio">
                    <TextInput
                      type="number"
                      value={form.rangeStart}
                      onChange={(event) => setForm((prev) => ({ ...prev, rangeStart: event.target.value }))}
                      placeholder="1000"
                      aria-label="Rango inicio"
                      inputMode="numeric"
                      required
                    />
                  </FormField>
                  <FormField label="Rango fin">
                    <TextInput
                      type="number"
                      value={form.rangeEnd}
                      onChange={(event) => setForm((prev) => ({ ...prev, rangeEnd: event.target.value }))}
                      placeholder="1999"
                      aria-label="Rango fin"
                      inputMode="numeric"
                      required
                    />
                  </FormField>
                </div>
              )}
            </Card>

            <div style={formGridLayout}>
              <FormField label="Costo">
                <TextInput
                  type="number"
                  step="0.01"
                  value={form.costAmount}
                  onChange={(event) => setForm((prev) => ({ ...prev, costAmount: event.target.value }))}
                  placeholder="5.00"
                  aria-label="Costo"
                  inputMode="decimal"
                  required
                />
              </FormField>

              <FormField label="Moneda">
                <TextInput
                  type="text"
                  value={form.currency}
                  onChange={(event) => setForm((prev) => ({ ...prev, currency: event.target.value }))}
                  placeholder="ARS"
                  aria-label="Moneda"
                  required
                />
              </FormField>
            </div>

            <div>
              <Button type="submit" variant="primary" disabled={saving} aria-busy={saving}>
                {saving ? 'Guardando...' : 'Crear zona'}
              </Button>
            </div>
          </form>
        </Card>
      </Section>

      <ConfirmDialog
        open={Boolean(pendingDeleteId)}
        title="Eliminar zona"
        message="Esta acción eliminará la zona de envío. ¿Querés continuar?"
        confirmLabel="Eliminar"
        onCancel={() => setPendingDeleteId(null)}
        onConfirm={() => {
          if (!pendingDeleteId) return
          void onDelete(pendingDeleteId)
          setPendingDeleteId(null)
        }}
        confirmDisabled={saving}
      />
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </AdminLayout>
  )
}
