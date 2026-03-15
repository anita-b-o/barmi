import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ecosystemAdminAdapter } from '../../api/adapters/ecosystemAdminAdapter'
import type {
  EcosystemShippingZone,
  EcosystemShippingZoneCreateReq,
  EcosystemShippingZoneType
} from '../../api/contracts/v1/ecosystemAdmin'
import { isApiError } from '../../api/client/errors'
import { routes } from '../../core/constants/routes'
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
import ConfirmDialog from '../components/ConfirmDialog'
import ToastContainer from '../components/ToastContainer'
import StatusBadge from '../components/StatusBadge'
import { theme } from '../theme/theme'

function toErrorMessage(error: unknown): string {
  if (isApiError(error)) return error.message
  if (error instanceof Error) return error.message
  return 'Error inesperado'
}

type ZoneFormState = {
  type: EcosystemShippingZoneType
  postalCode: string
  rangeStart: string
  rangeEnd: string
  costAmount: string
  currency: string
}

type ToastItem = {
  id: string
  message: string
  variant?: 'success' | 'error' | 'info'
}

const initialForm: ZoneFormState = {
  type: 'EXACT',
  postalCode: '',
  rangeStart: '',
  rangeEnd: '',
  costAmount: '',
  currency: 'ARS'
}

export default function AdminEcosystemShippingScreen() {
  const { me, memberships, logout, authRequest } = useAuth()
  const activeEcosystems = memberships.ecosystems.filter((membership) => membership.status === 'ACTIVE')
  const [ecosystemId, setEcosystemId] = useState('')
  const [zones, setZones] = useState<EcosystemShippingZone[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<ZoneFormState>(initialForm)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const addToast = (message: string, variant: ToastItem['variant'] = 'info') => {
    const id = `${Date.now()}-${Math.random()}`
    setToasts((prev) => [...prev, { id, message, variant }])
  }

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }

  useEffect(() => {
    if (!ecosystemId && activeEcosystems.length > 0) {
      setEcosystemId(activeEcosystems[0].ecosystemId)
    }
  }, [activeEcosystems, ecosystemId])

  const loadZones = useCallback(async () => {
    if (!ecosystemId) {
      setZones([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const data = await ecosystemAdminAdapter.listShippingZones(ecosystemId, authRequest)
      setZones(data.filter((zone) => zone.isActive))
      setError(null)
    } catch (err) {
      setError(toErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [authRequest, ecosystemId])

  useEffect(() => {
    setForm(initialForm)
  }, [ecosystemId])

  useEffect(() => {
    void loadZones()
  }, [loadZones])

  const ecosystemOptions = useMemo(() => activeEcosystems.map((membership) => ({
    value: membership.ecosystemId,
    label: `${membership.ecosystemSlug} (${membership.role})`
  })), [activeEcosystems])

  const sortedZones = useMemo(() => {
    return [...zones].sort((a, b) => {
      if (a.type !== b.type) return a.type === 'EXACT' ? -1 : 1
      if (a.type === 'EXACT') return String(a.postalCode ?? '').localeCompare(String(b.postalCode ?? ''))
      return (a.rangeStart ?? 0) - (b.rangeStart ?? 0)
    })
  }, [zones])

  const tableRows = sortedZones.map((zone) => ([
    <span key={`${zone.zoneId}-id`} style={{ fontWeight: 600 }}>{zone.zoneId}</span>,
    <span key={`${zone.zoneId}-type`}>{zone.type}</span>,
    <span key={`${zone.zoneId}-coverage`}>
      {zone.type === 'EXACT' ? (zone.postalCode ?? '-') : `${zone.rangeStart ?? ''} - ${zone.rangeEnd ?? ''}`}
    </span>,
    <span key={`${zone.zoneId}-cost`}>{zone.costAmount}</span>,
    <span key={`${zone.zoneId}-currency`}>{zone.currency}</span>,
    <StatusBadge key={`${zone.zoneId}-active`} status={zone.isActive ? 'ACTIVE' : 'INACTIVE'} />,
    <Button key={`${zone.zoneId}-action`} variant="ghost" onClick={() => setPendingDeleteId(zone.zoneId)} disabled={saving}>
      Eliminar
    </Button>
  ]))

  const resetForm = () => {
    setForm(initialForm)
  }

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!ecosystemId) {
      setError('Seleccioná un ecosystem')
      return
    }

    const costAmount = Number(form.costAmount)
    if (Number.isNaN(costAmount)) {
      setError('El costo debe ser numérico')
      return
    }

    if (!form.currency.trim()) {
      setError('La moneda es requerida')
      return
    }

    let payload: EcosystemShippingZoneCreateReq

    if (form.type === 'EXACT') {
      if (!form.postalCode.trim()) {
        setError('El código postal es requerido')
        return
      }

      payload = {
        ecosystemId,
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

      if (rangeStart > rangeEnd) {
        setError('El rango inicial no puede ser mayor al final')
        return
      }

      payload = {
        ecosystemId,
        type: 'RANGE',
        rangeStart,
        rangeEnd,
        costAmount,
        currency: form.currency.trim()
      }
    }

    try {
      setSaving(true)
      setError(null)
      await ecosystemAdminAdapter.createShippingZone(payload, authRequest)
      await loadZones()
      resetForm()
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
    if (!ecosystemId) return

    try {
      setSaving(true)
      setError(null)
      await ecosystemAdminAdapter.deleteShippingZone(zoneId, ecosystemId, authRequest)
      await loadZones()
      addToast('Zona eliminada', 'success')
    } catch (err) {
      const message = toErrorMessage(err)
      setError(message)
      addToast(message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminLayout>
      <PageHeader
        title="Ecosystem Shipping"
        subtitle={me?.email}
        actions={(
          <>
            <Link to={routes.adminEcosystem} style={{ color: theme.colors.textMuted, textDecoration: 'none' }}>Volver</Link>
            <Button variant="ghost" onClick={logout}>Logout</Button>
          </>
        )}
      />

      {error && <div style={{ marginTop: theme.spacing.lg }}><ErrorAlert message={error} /></div>}

      <Section title="Ecosystem activo">
        <Card>
          {ecosystemOptions.length === 0 && <EmptyState title="No hay ecosystems activos" />}
          {ecosystemOptions.length > 0 && (
            <FormField label="Ecosystem">
              <SelectField
                value={ecosystemId}
                onChange={(event) => setEcosystemId(event.target.value)}
                options={ecosystemOptions}
              />
            </FormField>
          )}
        </Card>
      </Section>

      <Section title="Zonas de envío">
        {loading && <LoadingBlock label="Cargando zonas..." />}
        {!loading && sortedZones.length === 0 && (
          <EmptyState title={ecosystemId ? 'No hay zonas configuradas' : 'Seleccioná un ecosystem'} />
        )}
        {!loading && sortedZones.length > 0 && (
          <DataTable
            headers={['Zone ID', 'Type', 'Coverage', 'Cost', 'Currency', 'Active', 'Actions']}
            rows={tableRows}
            emptyMessage="No hay zonas configuradas"
          />
        )}
      </Section>

      <Section title="Crear zona">
        <Card>
          <form onSubmit={onSubmit} style={{ display: 'grid', gap: theme.spacing.lg }}>
            <FormField label="Type">
              <SelectField
                value={form.type}
                onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value as EcosystemShippingZoneType }))}
                options={[
                  { value: 'EXACT', label: 'EXACT' },
                  { value: 'RANGE', label: 'RANGE' }
                ]}
              />
            </FormField>

            {form.type === 'EXACT' ? (
              <FormField label="Postal code">
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
                <FormField label="Range start">
                  <TextInput
                    type="number"
                    value={form.rangeStart}
                    onChange={(event) => setForm((prev) => ({ ...prev, rangeStart: event.target.value }))}
                    placeholder="1000"
                    required
                  />
                </FormField>
                <FormField label="Range end">
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

            <div style={{ display: 'grid', gap: theme.spacing.md, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
              <FormField label="Cost">
                <TextInput
                  type="number"
                  step="0.01"
                  value={form.costAmount}
                  onChange={(event) => setForm((prev) => ({ ...prev, costAmount: event.target.value }))}
                  placeholder="150.00"
                  required
                />
              </FormField>
              <FormField label="Currency">
                <TextInput
                  type="text"
                  value={form.currency}
                  onChange={(event) => setForm((prev) => ({ ...prev, currency: event.target.value }))}
                  placeholder="ARS"
                  required
                />
              </FormField>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <Button type="submit" variant="primary" disabled={saving || !ecosystemId}>
                {saving ? 'Guardando...' : 'Crear zona'}
              </Button>
              <Button type="button" variant="secondary" onClick={resetForm} disabled={saving}>
                Limpiar
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
