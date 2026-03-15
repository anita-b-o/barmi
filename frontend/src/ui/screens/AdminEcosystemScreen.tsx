import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ecosystemAdminAdapter } from '../../api/adapters/ecosystemAdminAdapter'
import type { EcosystemExternalProduct, EcosystemExternalProductCreateReq, EcosystemExternalProductUpdateReq } from '../../api/contracts/v1/ecosystemAdmin'
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
import StatusBadge from '../components/StatusBadge'
import ConfirmDialog from '../components/ConfirmDialog'
import ToastContainer from '../components/ToastContainer'
import { theme } from '../theme/theme'

function toErrorMessage(error: unknown): string {
  if (isApiError(error)) return error.message
  if (error instanceof Error) return error.message
  return 'Error inesperado'
}

type ProductFormState = {
  name: string
  priceAmount: string
  currency: string
  deliverySupported: boolean
  isActive: boolean
}

const initialForm: ProductFormState = {
  name: '',
  priceAmount: '',
  currency: 'ARS',
  deliverySupported: true,
  isActive: true
}

type ToastItem = {
  id: string
  message: string
  variant?: 'success' | 'error' | 'info'
}

export default function AdminEcosystemScreen() {
  const { me, memberships, logout, authRequest } = useAuth()
  const activeEcosystems = memberships.ecosystems.filter((membership) => membership.status === 'ACTIVE')
  const [ecosystemId, setEcosystemId] = useState('')
  const [products, setProducts] = useState<EcosystemExternalProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<ProductFormState>(initialForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const [query, setQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL')
  const [deliveryFilter, setDeliveryFilter] = useState<'ALL' | 'YES' | 'NO'>('ALL')

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

  const loadProducts = useCallback(async () => {
    if (!ecosystemId) return
    try {
      setLoading(true)
      const data = await ecosystemAdminAdapter.listProducts(ecosystemId, authRequest, { activeOnly: false })
      setProducts(data)
      setError(null)
    } catch (err) {
      setError(toErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [authRequest, ecosystemId])

  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  const onEdit = async (id: string) => {
    if (!ecosystemId) return
    try {
      setSaving(true)
      const product = await ecosystemAdminAdapter.getProduct(id, ecosystemId, authRequest)
      setEditingId(product.id)
      setForm({
        name: product.name,
        priceAmount: String(product.priceAmount),
        currency: product.currency,
        deliverySupported: product.deliverySupported,
        isActive: product.isActive
      })
    } catch (err) {
      setError(toErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const resetForm = () => {
    setEditingId(null)
    setForm(initialForm)
  }

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!ecosystemId) {
      setError('Seleccioná un ecosystem')
      return
    }

    const priceAmount = Number(form.priceAmount)
    if (Number.isNaN(priceAmount)) {
      setError('El precio debe ser numérico')
      return
    }

    try {
      setSaving(true)
      setError(null)

      if (editingId) {
        const payload: EcosystemExternalProductUpdateReq = {
          ecosystemId,
          name: form.name.trim(),
          priceAmount,
          currency: form.currency.trim(),
          deliverySupported: form.deliverySupported,
          isActive: form.isActive
        }
        const updated = await ecosystemAdminAdapter.updateProduct(editingId, payload, authRequest)
        setProducts((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
      } else {
        const payload: EcosystemExternalProductCreateReq = {
          ecosystemId,
          name: form.name.trim(),
          priceAmount,
          currency: form.currency.trim(),
          deliverySupported: form.deliverySupported,
          isActive: form.isActive
        }
        const created = await ecosystemAdminAdapter.createProduct(payload, authRequest)
        setProducts((prev) => [created, ...prev])
      }

      resetForm()
    } catch (err) {
      setError(toErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const onDelete = async (id: string) => {
    if (!ecosystemId) return
    try {
      setSaving(true)
      await ecosystemAdminAdapter.deleteProduct(id, ecosystemId, authRequest)
      setProducts((prev) => prev.filter((item) => item.id !== id))
      addToast('Producto eliminado', 'success')
    } catch (err) {
      const message = toErrorMessage(err)
      setError(message)
      addToast(message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const ecosystemOptions = useMemo(() => activeEcosystems.map((eco) => ({
    value: eco.ecosystemId,
    label: `${eco.ecosystemSlug} (${eco.role})`
  })), [activeEcosystems])

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      if (activeFilter === 'ACTIVE' && !product.isActive) return false
      if (activeFilter === 'INACTIVE' && product.isActive) return false
      if (deliveryFilter === 'YES' && !product.deliverySupported) return false
      if (deliveryFilter === 'NO' && product.deliverySupported) return false
      if (query.trim() && !product.name.toLowerCase().includes(query.trim().toLowerCase())) return false
      return true
    })
  }, [products, activeFilter, deliveryFilter, query])

  const hasActiveFilters = query.trim().length > 0 || activeFilter !== 'ALL' || deliveryFilter !== 'ALL'

  const productRows = filteredProducts.map((product) => ([
    <div key={`${product.id}-name`}>
      <div style={{ fontWeight: 600 }}>{product.name}</div>
      <div style={{ color: theme.colors.textMuted, fontSize: theme.typography.small.size }}>ID: {product.id}</div>
    </div>,
    <div key={`${product.id}-price`}>{product.priceAmount}</div>,
    <div key={`${product.id}-currency`}>{product.currency}</div>,
    <div key={`${product.id}-delivery`}>{product.deliverySupported ? 'Sí' : 'No'}</div>,
    <StatusBadge key={`${product.id}-status`} status={product.isActive ? 'ACTIVE' : 'INACTIVE'} />,
    <div key={`${product.id}-actions`} style={{ display: 'flex', gap: 8 }}>
      <Button variant="ghost" onClick={() => onEdit(product.id)} disabled={saving}>Editar</Button>
      <Button variant="ghost" onClick={() => setPendingDeleteId(product.id)} disabled={saving}>Eliminar</Button>
    </div>
  ]))

  return (
    <AdminLayout>
      <PageHeader
        title="Admin Ecosystem"
        subtitle={me?.email}
        actions={(
          <>
            <Link to="/admin" style={{ color: theme.colors.textMuted, textDecoration: 'none' }}>Volver</Link>
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

      <Section
        title="Filtros"
        action={(
          <Button
            variant="secondary"
            onClick={() => {
              setQuery('')
              setActiveFilter('ALL')
              setDeliveryFilter('ALL')
            }}
            disabled={!hasActiveFilters}
          >
            Limpiar filtros
          </Button>
        )}
      >
        <Card>
          <div style={{ display: 'grid', gap: theme.spacing.lg, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            <FormField label="Buscar por nombre">
              <TextInput
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Nombre del producto"
              />
            </FormField>
            <FormField label="Activo">
              <SelectField
                value={activeFilter}
                onChange={(event) => setActiveFilter(event.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE')}
                options={[
                  { value: 'ALL', label: 'Todos' },
                  { value: 'ACTIVE', label: 'Activos' },
                  { value: 'INACTIVE', label: 'Inactivos' }
                ]}
              />
            </FormField>
            <FormField label="Delivery soportado">
              <SelectField
                value={deliveryFilter}
                onChange={(event) => setDeliveryFilter(event.target.value as 'ALL' | 'YES' | 'NO')}
                options={[
                  { value: 'ALL', label: 'Todos' },
                  { value: 'YES', label: 'Sí' },
                  { value: 'NO', label: 'No' }
                ]}
              />
            </FormField>
          </div>
        </Card>
      </Section>

      <Section title="Productos externos">
        {loading && <LoadingBlock label="Cargando productos..." />}
        {!loading && filteredProducts.length === 0 && (
          <EmptyState
            title={hasActiveFilters ? 'No hay productos que coincidan con los filtros' : 'No hay productos cargados'}
            description={hasActiveFilters ? 'Probá cambiando la búsqueda o los filtros.' : undefined}
          />
        )}
        {!loading && filteredProducts.length > 0 && (
          <DataTable
            headers={['Producto', 'Precio', 'Moneda', 'Delivery', 'Estado', 'Acciones']}
            rows={productRows}
            emptyMessage="No hay productos cargados"
          />
        )}
      </Section>

      <Section title={editingId ? 'Editar producto' : 'Crear producto'}>
        <Card>
          <form onSubmit={onSubmit} style={{ display: 'grid', gap: theme.spacing.lg }}>
            <FormField label="Nombre">
              <TextInput
                type="text"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                required
              />
            </FormField>
            <div style={{ display: 'grid', gap: theme.spacing.md, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
              <FormField label="Precio">
                <TextInput
                  type="number"
                  step="0.01"
                  value={form.priceAmount}
                  onChange={(event) => setForm((prev) => ({ ...prev, priceAmount: event.target.value }))}
                  required
                />
              </FormField>
              <FormField label="Moneda">
                <TextInput
                  type="text"
                  value={form.currency}
                  onChange={(event) => setForm((prev) => ({ ...prev, currency: event.target.value }))}
                  required
                />
              </FormField>
            </div>

            <div style={{ display: 'grid', gap: theme.spacing.md, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
              <FormField label="Delivery soportado">
                <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="checkbox"
                    checked={form.deliverySupported}
                    onChange={(event) => setForm((prev) => ({ ...prev, deliverySupported: event.target.checked }))}
                  />
                  <span>Disponible</span>
                </label>
              </FormField>

              <FormField label="Estado">
                <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))}
                  />
                  <span>{form.isActive ? 'Activo' : 'Inactivo'}</span>
                </label>
              </FormField>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <Button type="submit" variant="primary" disabled={saving}>
                {saving ? 'Guardando...' : editingId ? 'Actualizar' : 'Crear'}
              </Button>
              {editingId && (
                <Button type="button" variant="secondary" onClick={resetForm} disabled={saving}>Cancelar</Button>
              )}
            </div>
          </form>
        </Card>
      </Section>

      <ConfirmDialog
        open={Boolean(pendingDeleteId)}
        title="Eliminar producto"
        message="Esta acción eliminará el producto. ¿Querés continuar?"
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
