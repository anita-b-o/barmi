import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ecosystemAdminAdapter } from '../../api/adapters/ecosystemAdminAdapter'
import type {
  EcosystemExternalProduct,
  EcosystemExternalProductCreateReq,
  EcosystemExternalProductUpdateReq
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

type ProductFormState = {
  name: string
  priceAmount: string
  currency: string
  deliverySupported: boolean
  isActive: boolean
}

type ToastItem = {
  id: string
  message: string
  variant?: 'success' | 'error' | 'info'
}

const initialForm: ProductFormState = {
  name: '',
  priceAmount: '',
  currency: 'ARS',
  deliverySupported: true,
  isActive: true
}

const booleanOptions = [
  { value: 'true', label: 'Sí' },
  { value: 'false', label: 'No' }
]

export default function AdminEcosystemProductsScreen() {
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

  const resetForm = useCallback(() => {
    setEditingId(null)
    setForm(initialForm)
  }, [])

  const loadProducts = useCallback(async () => {
    if (!ecosystemId) {
      setProducts([])
      setLoading(false)
      return
    }

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
    resetForm()
  }, [ecosystemId, resetForm])

  useEffect(() => {
    void loadProducts()
  }, [loadProducts])

  const onEdit = async (id: string) => {
    if (!ecosystemId) return

    try {
      setSaving(true)
      setError(null)
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
      const message = toErrorMessage(err)
      setError(message)
      addToast(message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!ecosystemId) {
      setError('Seleccioná un ecosystem')
      return
    }

    const name = form.name.trim()
    const currency = form.currency.trim()
    const priceAmount = Number(form.priceAmount)

    if (!name) {
      setError('El nombre es requerido')
      return
    }

    if (Number.isNaN(priceAmount)) {
      setError('El precio debe ser numérico')
      return
    }

    if (priceAmount <= 0) {
      setError('El precio debe ser mayor a cero')
      return
    }

    if (!currency) {
      setError('La moneda es requerida')
      return
    }

    try {
      setSaving(true)
      setError(null)

      if (editingId) {
        const payload: EcosystemExternalProductUpdateReq = {
          ecosystemId,
          name,
          priceAmount,
          currency,
          deliverySupported: form.deliverySupported,
          isActive: form.isActive
        }
        await ecosystemAdminAdapter.updateProduct(editingId, payload, authRequest)
        addToast('Producto actualizado', 'success')
      } else {
        const payload: EcosystemExternalProductCreateReq = {
          ecosystemId,
          name,
          priceAmount,
          currency,
          deliverySupported: form.deliverySupported,
          isActive: form.isActive
        }
        await ecosystemAdminAdapter.createProduct(payload, authRequest)
        addToast('Producto creado', 'success')
      }

      await loadProducts()
      resetForm()
    } catch (err) {
      const message = toErrorMessage(err)
      setError(message)
      addToast(message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const onDelete = async (id: string) => {
    if (!ecosystemId) return

    try {
      setSaving(true)
      setError(null)
      await ecosystemAdminAdapter.deleteProduct(id, ecosystemId, authRequest)
      await loadProducts()
      addToast('Producto eliminado', 'success')
    } catch (err) {
      const message = toErrorMessage(err)
      setError(message)
      addToast(message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const ecosystemOptions = useMemo(() => activeEcosystems.map((membership) => ({
    value: membership.ecosystemId,
    label: `${membership.ecosystemSlug} (${membership.role})`
  })), [activeEcosystems])

  const sortedProducts = useMemo(() => {
    return [...products].sort((a, b) => a.name.localeCompare(b.name))
  }, [products])

  const productRows = sortedProducts.map((product) => ([
    <span key={`${product.id}-id`} style={{ fontWeight: 600 }}>{product.id}</span>,
    <span key={`${product.id}-name`}>{product.name}</span>,
    <span key={`${product.id}-price`}>{product.priceAmount}</span>,
    <span key={`${product.id}-currency`}>{product.currency}</span>,
    <span key={`${product.id}-delivery`}>{product.deliverySupported ? 'Sí' : 'No'}</span>,
    <StatusBadge key={`${product.id}-active`} status={product.isActive ? 'ACTIVE' : 'INACTIVE'} />,
    <div key={`${product.id}-actions`} style={{ display: 'flex', gap: 8 }}>
      <Button variant="ghost" onClick={() => void onEdit(product.id)} disabled={saving}>Editar</Button>
      <Button variant="ghost" onClick={() => setPendingDeleteId(product.id)} disabled={saving}>Eliminar</Button>
    </div>
  ]))

  return (
    <AdminLayout>
      <PageHeader
        title="Ecosystem Products"
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

      <Section title="Productos">
        {loading && <LoadingBlock label="Cargando productos..." />}
        {!loading && sortedProducts.length === 0 && (
          <EmptyState title={ecosystemId ? 'No hay productos cargados' : 'Seleccioná un ecosystem'} />
        )}
        {!loading && sortedProducts.length > 0 && (
          <DataTable
            headers={['ID', 'Name', 'Price', 'Currency', 'Delivery supported', 'Active', 'Actions']}
            rows={productRows}
            emptyMessage="No hay productos cargados"
          />
        )}
      </Section>

      <Section title={editingId ? 'Editar producto' : 'Crear producto'}>
        <Card>
          <form onSubmit={onSubmit} style={{ display: 'grid', gap: theme.spacing.lg }}>
            <FormField label="Name">
              <TextInput
                type="text"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                required
              />
            </FormField>

            <div style={{ display: 'grid', gap: theme.spacing.md, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
              <FormField label="Price">
                <TextInput
                  type="number"
                  step="0.01"
                  value={form.priceAmount}
                  onChange={(event) => setForm((prev) => ({ ...prev, priceAmount: event.target.value }))}
                  placeholder="100.00"
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

            <div style={{ display: 'grid', gap: theme.spacing.md, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
              <FormField label="Delivery supported">
                <SelectField
                  value={String(form.deliverySupported)}
                  onChange={(event) => setForm((prev) => ({ ...prev, deliverySupported: event.target.value === 'true' }))}
                  options={booleanOptions}
                />
              </FormField>
              <FormField label="Active">
                <SelectField
                  value={String(form.isActive)}
                  onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.value === 'true' }))}
                  options={booleanOptions}
                />
              </FormField>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <Button type="submit" variant="primary" disabled={saving || !ecosystemId}>
                {saving ? 'Guardando...' : editingId ? 'Actualizar' : 'Crear producto'}
              </Button>
              <Button type="button" variant="secondary" onClick={resetForm} disabled={saving}>
                {editingId ? 'Cancelar' : 'Limpiar'}
              </Button>
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
