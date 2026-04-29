import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { storeAdminAdapter } from '../../../../api/adapters/storeAdminAdapter'
import type {
  StoreAdminProduct,
  StoreAdminProductCreateReq,
  StoreAdminProductUpdateReq,
  StoreCategory
} from '../../../../api/contracts/v1/storeAdmin'
import { isApiError } from '../../../../api/client/errors'
import { useAuth } from '@/core/auth/authContext'
import { routes } from '@/core/constants/routes'
import { formatDate, formatMoneyFromCents } from '@/core/utils/format'
import AdminLayout from '@/layouts/AdminLayout'
import PageHeader from '@/components/navigation/SectionHeader'
import Section from '@/components/ui/Section'
import Card from '@/components/primitives/Card'
import Button from '@/components/primitives/Button'
import DataTable from '@/components/primitives/Table'
import ConfirmDialog from '@/components/primitives/Modal/ConfirmDialog'
import ErrorAlert from '@/components/feedback/ErrorState'
import LoadingBlock from '@/components/feedback/LoadingState'
import EmptyState from '@/components/feedback/EmptyState'
import ToastContainer from '@/components/feedback/ToastContainer'
import StatusBadge from '@/components/commerce/StatusBadge'
import FormField from '@/components/forms/Field'
import TextInput from '@/components/primitives/Input'
import SelectField from '@/components/primitives/Select'
import { Breadcrumbs, ContextHeader } from '@/components/navigation'
import { theme } from '@/app/theme'

function toErrorMessage(error: unknown): string {
  if (isApiError(error)) return error.message
  if (error instanceof Error) return error.message
  return 'Error inesperado'
}

type ProductFormState = {
  sku: string
  name: string
  priceCents: string
  stockQuantity: string
  categoryId: string
}

type CategoryFormState = {
  name: string
  sortOrder: string
}

type EditMode = 'full' | 'stock'

type ToastItem = {
  id: string
  message: string
  variant?: 'success' | 'error' | 'info'
}

const initialForm: ProductFormState = {
  sku: '',
  name: '',
  priceCents: '',
  stockQuantity: '0',
  categoryId: ''
}

const initialCategoryForm: CategoryFormState = {
  name: '',
  sortOrder: '0'
}

export default function AdminStoreProductsScreen() {
  const { me, memberships, logout, authRequest } = useAuth()
  const activeStores = memberships.stores.filter((membership) => membership.status === 'ACTIVE')
  const [products, setProducts] = useState<StoreAdminProduct[]>([])
  const [categories, setCategories] = useState<StoreCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<ProductFormState>(initialForm)
  const [categoryForm, setCategoryForm] = useState<CategoryFormState>(initialCategoryForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editMode, setEditMode] = useState<EditMode>('full')
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const addToast = (message: string, variant: ToastItem['variant'] = 'info') => {
    const id = `${Date.now()}-${Math.random()}`
    setToasts((prev) => [...prev, { id, message, variant }])
  }

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }

  const resetForm = useCallback(() => {
    setEditingId(null)
    setEditMode('full')
    setForm(initialForm)
  }, [])

  const loadCatalogData = useCallback(async () => {
    try {
      setLoading(true)
      const [productsData, categoriesData] = await Promise.all([
        storeAdminAdapter.listProducts(authRequest),
        storeAdminAdapter.listCategories(authRequest)
      ])
      setProducts(productsData)
      setCategories(categoriesData)
      setError(null)
    } catch (err) {
      setError(toErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [authRequest])

  useEffect(() => {
    void loadCatalogData()
  }, [loadCatalogData])

  const onEdit = async (id: string, mode: EditMode = 'full') => {
    try {
      setSaving(true)
      setError(null)
      const product = await storeAdminAdapter.getProduct(id, authRequest)
      setEditingId(product.id)
      setEditMode(mode)
      setForm({
        sku: product.sku,
        name: product.name,
        priceCents: String(product.priceCents),
        stockQuantity: String(product.stockQuantity),
        categoryId: product.categoryId ?? ''
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
    setError(null)

    const sku = form.sku.trim()
    const name = form.name.trim()
    const priceCents = Number(form.priceCents)
    const stockQuantity = Number(form.stockQuantity)
    const categoryId = form.categoryId || null

    if (!sku) {
      setError('El SKU es requerido')
      return
    }
    if (!name) {
      setError('El nombre es requerido')
      return
    }
    if (Number.isNaN(priceCents)) {
      setError('El precio debe ser numérico')
      return
    }
    if (priceCents < 0) {
      setError('El precio no puede ser negativo')
      return
    }
    if (!Number.isInteger(stockQuantity)) {
      setError('El stock debe ser un número entero')
      return
    }
    if (stockQuantity < 0) {
      setError('El stock no puede ser negativo')
      return
    }

    try {
      setSaving(true)
      if (editingId) {
        const payload: StoreAdminProductUpdateReq = { sku, name, priceCents, stockQuantity, categoryId }
        await storeAdminAdapter.updateProduct(editingId, payload, authRequest)
        addToast(editMode === 'stock' ? 'Stock actualizado' : 'Producto actualizado', 'success')
      } else {
        const payload: StoreAdminProductCreateReq = { sku, name, priceCents, stockQuantity, categoryId }
        await storeAdminAdapter.createProduct(payload, authRequest)
        addToast('Producto creado', 'success')
      }

      await loadCatalogData()
      resetForm()
    } catch (err) {
      const message = toErrorMessage(err)
      setError(message)
      addToast(message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const onCreateCategory = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)

    const name = categoryForm.name.trim()
    const sortOrder = Number(categoryForm.sortOrder)

    if (!name) {
      setError('El nombre de la categoría es requerido')
      return
    }
    if (!Number.isInteger(sortOrder)) {
      setError('El orden de la categoría debe ser un número entero')
      return
    }

    try {
      setSaving(true)
      await storeAdminAdapter.createCategory({ name, sortOrder }, authRequest)
      setCategoryForm(initialCategoryForm)
      await loadCatalogData()
      addToast('Categoría creada', 'success')
    } catch (err) {
      const message = toErrorMessage(err)
      setError(message)
      addToast(message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const onToggleCategory = async (category: StoreCategory) => {
    try {
      setSaving(true)
      setError(null)
      await storeAdminAdapter.updateCategoryActive(category.id, !category.active, authRequest)
      await loadCatalogData()
      addToast(category.active ? 'Categoría desactivada' : 'Categoría activada', 'success')
    } catch (err) {
      const message = toErrorMessage(err)
      setError(message)
      addToast(message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const onDelete = async (id: string) => {
    try {
      setSaving(true)
      setError(null)
      await storeAdminAdapter.deleteProduct(id, authRequest)
      await loadCatalogData()
      addToast('Producto desactivado', 'success')
    } catch (err) {
      const message = toErrorMessage(err)
      setError(message)
      addToast(message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const sortedProducts = useMemo(
    () => [...products].sort((a, b) => a.name.localeCompare(b.name)),
    [products]
  )

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)),
    [categories]
  )

  const categoryOptions = useMemo(
    () => [
      { value: '', label: 'Sin categoría' },
      ...sortedCategories.map((category) => ({
        value: category.id,
        label: category.active ? category.name : `${category.name} · inactiva`
      }))
    ],
    [sortedCategories]
  )

  const rows = sortedProducts.map((product) => ([
    <div key={`${product.id}-sku`}>
      <div style={{ fontWeight: 600 }}>{product.sku}</div>
      <div style={{ color: theme.colors.textMuted, fontSize: theme.typography.small.size }}>{product.id}</div>
    </div>,
    <span key={`${product.id}-name`}>{product.name}</span>,
    <span key={`${product.id}-category`}>{product.categoryName ?? 'Sin categoría'}</span>,
    <span key={`${product.id}-price`}>{formatMoneyFromCents(product.priceCents)}</span>,
    <div key={`${product.id}-stock`}>
      <div style={{ fontWeight: 600 }}>{product.stockQuantity}</div>
      <div style={{ color: theme.colors.textMuted, fontSize: theme.typography.small.size }}>
        {!product.isActive ? 'Inactivo' : product.isAvailable ? 'Disponible' : 'Sin stock'}
      </div>
    </div>,
    <StatusBadge key={`${product.id}-active`} status={product.isActive ? 'ACTIVE' : 'INACTIVE'} />,
    <span key={`${product.id}-created`}>{formatDate(product.createdAt)}</span>,
    <div key={`${product.id}-actions`} style={{ display: 'flex', gap: 8 }}>
      <Button variant="ghost" onClick={() => void onEdit(product.id)} disabled={saving}>Editar</Button>
      <Button variant="ghost" onClick={() => void onEdit(product.id, 'stock')} disabled={saving}>Ajustar stock</Button>
      <Button variant="ghost" onClick={() => setPendingDeleteId(product.id)} disabled={saving || !product.isActive}>Desactivar</Button>
    </div>
  ]))

  return (
    <AdminLayout>
      <Breadcrumbs items={[{ label: 'Admin', href: routes.adminHome }, { label: 'Store', href: routes.adminStore }, { label: 'Productos' }]} />
      <PageHeader
        title="Productos STORE"
        subtitle={me?.email}
        actions={(
          <>
            <Link to={routes.adminStore} style={{ color: theme.colors.textMuted, textDecoration: 'none' }}>Volver al hub</Link>
            <Button variant="ghost" onClick={logout}>Cerrar sesión</Button>
          </>
        )}
      />

      <ContextHeader
        badge="Catálogo"
        title="Gestión operativa de productos STORE"
        description="El alta, edición y desactivación se resuelven sobre la store actual. El catálogo público muestra productos activos y marca la disponibilidad según stock."
      />

      {error && (
        <div style={{ marginTop: theme.spacing.lg }}>
          <ErrorAlert message={error} actionLabel="Reintentar" onAction={() => void loadCatalogData()} actionDisabled={loading} />
        </div>
      )}

      <Section title="Stores activas">
        <Card>
          {activeStores.length === 0 ? (
            <EmptyState title="No hay stores activas" description="Necesitas una membership activa para operar productos." />
          ) : (
            <div style={{ display: 'grid', gap: theme.spacing.md }}>
              {activeStores.map((membership) => (
                <div key={membership.storeId} style={{ display: 'flex', justifyContent: 'space-between', gap: theme.spacing.lg, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{membership.storeSlug}</div>
                    <div style={{ color: theme.colors.textMuted, marginTop: 4 }}>{membership.role}</div>
                  </div>
                  <div style={{ color: theme.colors.textMuted }}>{membership.storeId}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </Section>

      <Section title={editingId ? (editMode === 'stock' ? 'Ajustar stock' : 'Editar producto') : 'Crear producto'}>
        <Card>
          <form onSubmit={(event) => void onSubmit(event)} style={{ display: 'grid', gap: theme.spacing.lg }}>
            {editingId && editMode === 'stock' ? (
              <Card variant="soft">
                <div style={{ display: 'grid', gap: theme.spacing.xs }}>
                  <div style={{ fontWeight: 700 }}>{form.name || 'Producto STORE'}</div>
                  <div style={{ color: theme.colors.textMuted }}>SKU: {form.sku || '-'}</div>
                  <div style={{ color: theme.colors.textMuted }}>Precio actual: {form.priceCents ? formatMoneyFromCents(Number(form.priceCents)) : '-'}</div>
                </div>
              </Card>
            ) : (
              <>
                <FormField label="SKU" hint="Identificador interno único por store">
                  <TextInput value={form.sku} onChange={(event) => setForm((prev) => ({ ...prev, sku: event.target.value }))} placeholder="SKU-CAFE" />
                </FormField>
                <FormField label="Nombre">
                  <TextInput value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} placeholder="Cafe tostado" />
                </FormField>
                <FormField label="Precio en centavos" hint="Se mantiene el contrato actual de priceCents">
                  <TextInput value={form.priceCents} onChange={(event) => setForm((prev) => ({ ...prev, priceCents: event.target.value }))} placeholder="1500" />
                </FormField>
                <FormField label="Categoría">
                  <SelectField
                    value={form.categoryId}
                    onChange={(event) => setForm((prev) => ({ ...prev, categoryId: event.target.value }))}
                    options={categoryOptions}
                    aria-label="Categoría del producto"
                  />
                </FormField>
              </>
            )}
            <FormField label="Stock disponible" hint="Cantidad simple disponible para checkout STORE">
              <TextInput value={form.stockQuantity} onChange={(event) => setForm((prev) => ({ ...prev, stockQuantity: event.target.value }))} placeholder="25" />
            </FormField>
            <div style={{ display: 'flex', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
              <Button type="submit" disabled={saving}>
                {editingId ? (editMode === 'stock' ? 'Guardar stock' : 'Guardar cambios') : 'Crear producto'}
              </Button>
              {editingId ? <Button variant="ghost" type="button" onClick={resetForm} disabled={saving}>Cancelar</Button> : null}
            </div>
          </form>
        </Card>
      </Section>

      <Section title="Categorías STORE">
        <Card>
          <div style={{ display: 'grid', gap: theme.spacing.lg }}>
            <form onSubmit={(event) => void onCreateCategory(event)} style={{ display: 'grid', gap: theme.spacing.md, gridTemplateColumns: 'minmax(0, 1.5fr) minmax(140px, 180px) auto', alignItems: 'end' }}>
              <FormField label="Nombre de categoría">
                <TextInput
                  value={categoryForm.name}
                  onChange={(event) => setCategoryForm((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="Bebidas"
                />
              </FormField>
              <FormField label="Orden">
                <TextInput
                  value={categoryForm.sortOrder}
                  onChange={(event) => setCategoryForm((prev) => ({ ...prev, sortOrder: event.target.value }))}
                  placeholder="0"
                />
              </FormField>
              <Button type="submit" disabled={saving}>Crear categoría</Button>
            </form>

            {sortedCategories.length === 0 ? (
              <EmptyState title="Todavía no hay categorías" description="Podés crear categorías simples y luego asignarlas a productos." />
            ) : (
              <DataTable
                headers={['Nombre', 'Orden', 'Estado', 'Creada', 'Acciones']}
                rows={sortedCategories.map((category) => ([
                  <span key={`${category.id}-name`}>{category.name}</span>,
                  <span key={`${category.id}-sort`}>{category.sortOrder}</span>,
                  <StatusBadge key={`${category.id}-status`} status={category.active ? 'ACTIVE' : 'INACTIVE'} />,
                  <span key={`${category.id}-created`}>{formatDate(category.createdAt)}</span>,
                  <div key={`${category.id}-actions`} style={{ display: 'flex', gap: 8 }}>
                    <Button variant="ghost" onClick={() => void onToggleCategory(category)} disabled={saving}>
                      {category.active ? 'Desactivar' : 'Activar'}
                    </Button>
                  </div>
                ]))}
              />
            )}
          </div>
        </Card>
      </Section>

      <Section title="Productos de la store">
        <Card>
          {loading ? (
            <LoadingBlock label="Cargando productos..." />
          ) : sortedProducts.length === 0 ? (
            <EmptyState title="Todavía no hay productos" description="Creá el primer producto para habilitar la gestión del catálogo store." />
          ) : (
            <DataTable
              headers={['SKU', 'Nombre', 'Categoría', 'Precio', 'Stock', 'Estado', 'Creado', 'Acciones']}
              rows={rows}
            />
          )}
        </Card>
      </Section>

      <ConfirmDialog
        open={pendingDeleteId !== null}
        title="Desactivar producto"
        description="El producto dejará de verse en el catálogo público y no podrá usarse en checkout."
        confirmLabel="Desactivar"
        cancelLabel="Cancelar"
        onCancel={() => setPendingDeleteId(null)}
        onConfirm={() => {
          const id = pendingDeleteId
          setPendingDeleteId(null)
          if (id) {
            void onDelete(id)
          }
        }}
      />

      <ToastContainer toasts={toasts} onClose={removeToast} />
    </AdminLayout>
  )
}
