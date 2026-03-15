import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { storeAdminAdapter } from '../../api/adapters/storeAdminAdapter'
import type { StoreShippingZone, StoreShippingZoneCreateReq, StoreShippingZoneType } from '../../api/contracts/v1/storeAdmin'
import { isApiError } from '../../api/client/errors'
import { useAuth } from '../state/authContext'
import AdminLayout from '../layout/AdminLayout'
import PageHeader from '../components/PageHeader'
import Section from '../components/Section'
import Card from '../components/Card'
import Button from '../components/Button'
import ErrorAlert from '../components/ErrorAlert'
import LoadingBlock from '../components/LoadingBlock'
import EmptyState from '../components/EmptyState'
import DataTable from '../components/DataTable'
import FormField from '../components/FormField'
import TextInput from '../components/TextInput'
import SelectField from '../components/SelectField'
import Badge from '../components/Badge'
import ConfirmDialog from '../components/ConfirmDialog'
import ToastContainer from '../components/ToastContainer'
import { theme } from '../theme/theme'

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

    const costAmount = Number(form.costAmount)
    if (Number.isNaN(costAmount)) {
      setError('El costo debe ser numérico')
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
        currency: form.currency.trim()
      }
    } else {
      const rangeStart = Number(form.rangeStart)
      const rangeEnd = Number(form.rangeEnd)
      if (Number.isNaN(rangeStart) || Number.isNaN(rangeEnd)) {
        setError('El rango debe ser numérico')
        return
      }
      payload = {
        type: 'RANGE',
        rangeStart,
        rangeEnd,
        costAmount,
        currency: form.currency.trim()
      }
    }

    try {
      setSaving(true)
      const created = await storeAdminAdapter.createZone(payload, authRequest)
      setZones((prev) => [...prev, created])
      setForm(initialForm)
      setError(null)
    } catch (err) {
      setError(toErrorMessage(err))
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
      return <Badge style={{ background: '#E7EEF9', color: theme.colors.info }}>EXACT</Badge>
    }
    return <Badge style={{ background: '#F0E9FF', color: '#6E4ACB' }}>RANGE</Badge>
  }

  const tableRows = filteredZones.map((zone) => ([
    <div key={`${zone.zoneId}-id`}>
      <div style={{ fontWeight: 600 }}>{zone.zoneId}</div>
      <div style={{ color: theme.colors.textMuted, fontSize: theme.typography.small.size }}>
        {zone.type === 'EXACT' ? `CP ${zone.postalCode ?? ''}` : `Rango ${zone.rangeStart ?? ''}-${zone.rangeEnd ?? ''}`}
      </div>
    </div>,
    <div key={`${zone.zoneId}-type`}>{typeBadge(zone.type)}</div>,
    <div key={`${zone.zoneId}-postal`}>
      {zone.type === 'EXACT' ? zone.postalCode ?? '-' : `${zone.rangeStart ?? ''} - ${zone.rangeEnd ?? ''}`}
    </div>,
    <div key={`${zone.zoneId}-cost`}>{zone.costAmount}</div>,
    <div key={`${zone.zoneId}-currency`}>{zone.currency}</div>,
    <Button key={`${zone.zoneId}-action`} variant="ghost" onClick={() => setPendingDeleteId(zone.zoneId)} disabled={saving}>Eliminar</Button>
  ]))

  return (
    <AdminLayout>
      <PageHeader
        title="Admin Store"
        subtitle={me?.email}
        actions={(
          <>
            <Link to="/admin" style={{ color: theme.colors.textMuted, textDecoration: 'none' }}>Volver</Link>
            <Button variant="ghost" onClick={logout}>Logout</Button>
          </>
        )}
      />

      {error && <div style={{ marginTop: theme.spacing.lg }}><ErrorAlert message={error} /></div>}

      <Section title="Stores activas">
        <Card>
          {activeStores.length === 0 && (
            <EmptyState title="No hay stores activas" />
          )}
          {activeStores.length > 0 && (
            <div style={{ display: 'grid', gap: 8 }}>
              {activeStores.map((store) => (
                <div key={store.storeId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: 600 }}>{store.storeSlug}</div>
                  <div style={{ color: theme.colors.textMuted }}>{store.role}</div>
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
          <div style={{ display: 'grid', gap: theme.spacing.lg, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            <FormField label="Tipo">
              <SelectField
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value as 'ALL' | StoreShippingZoneType)}
                options={[
                  { value: 'ALL', label: 'Todos' },
                  { value: 'EXACT', label: 'EXACT' },
                  { value: 'RANGE', label: 'RANGE' }
                ]}
              />
            </FormField>
            <FormField label="Buscar por código o rango">
              <TextInput
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="1900 / 1000-1999 / zoneId"
              />
            </FormField>
          </div>
        </Card>
      </Section>

      <Section title="Zonas de envío">
        {loadingZones && <LoadingBlock label="Cargando zonas..." />}
        {!loadingZones && filteredZones.length === 0 && (
          <EmptyState
            title={hasActiveFilters ? 'No hay zonas que coincidan con los filtros' : 'No hay zonas configuradas'}
            description={hasActiveFilters ? 'Probá cambiando la búsqueda o el tipo.' : undefined}
          />
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
          <form onSubmit={onSubmit} style={{ display: 'grid', gap: theme.spacing.lg }}>
            <FormField label="Tipo">
              <SelectField
                value={form.type}
                onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value as StoreShippingZoneType }))}
                options={[
                  { value: 'EXACT', label: 'EXACT' },
                  { value: 'RANGE', label: 'RANGE' }
                ]}
              />
            </FormField>

            <Card variant="soft">
              {form.type === 'EXACT' ? (
                <FormField label="Código postal">
                  <TextInput
                    type="text"
                    value={form.postalCode}
                    onChange={(event) => setForm((prev) => ({ ...prev, postalCode: event.target.value }))}
                    placeholder="1234"
                    required
                  />
                </FormField>
              ) : (
                <div style={{ display: 'grid', gap: theme.spacing.md, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                  <FormField label="Rango inicio">
                    <TextInput
                      type="number"
                      value={form.rangeStart}
                      onChange={(event) => setForm((prev) => ({ ...prev, rangeStart: event.target.value }))}
                      placeholder="1000"
                      required
                    />
                  </FormField>
                  <FormField label="Rango fin">
                    <TextInput
                      type="number"
                      value={form.rangeEnd}
                      onChange={(event) => setForm((prev) => ({ ...prev, rangeEnd: event.target.value }))}
                      placeholder="1999"
                      required
                    />
                  </FormField>
                </div>
              )}
            </Card>

            <div style={{ display: 'grid', gap: theme.spacing.md, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
              <FormField label="Costo">
                <TextInput
                  type="number"
                  step="0.01"
                  value={form.costAmount}
                  onChange={(event) => setForm((prev) => ({ ...prev, costAmount: event.target.value }))}
                  placeholder="5.00"
                  required
                />
              </FormField>

              <FormField label="Moneda">
                <TextInput
                  type="text"
                  value={form.currency}
                  onChange={(event) => setForm((prev) => ({ ...prev, currency: event.target.value }))}
                  placeholder="ARS"
                  required
                />
              </FormField>
            </div>

            <div>
              <Button type="submit" variant="primary" disabled={saving}>
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
