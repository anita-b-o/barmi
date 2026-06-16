import { useCallback, useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
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

const categoryFormLayout: CSSProperties = {
  display: 'grid',
  gap: 12,
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  alignItems: 'end'
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
        padding: theme.spacing.md,
        border: `1px solid ${theme.colors.borderDefault}`,
        borderRadius: theme.radius.md,
        background: theme.colors.bgSurfaceAlt
      } satisfies CSSProperties,
      stockSummary: {
        display: 'grid',
        gap: theme.spacing.xs,
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
      <div style={styles.strongText}>{product.sku}</div>
      <div style={styles.mutedCell}>{product.id}</div>
    </div>,
    <span key={`${product.id}-name`} style={styles.secondaryText}>{product.name}</span>,
    <span key={`${product.id}-category`} style={product.categoryName ? styles.secondaryText : styles.metaText}>
      {product.categoryName ?? 'Sin categoría'}
    </span>,
    <span key={`${product.id}-price`} style={styles.secondaryText}>{formatMoneyFromCents(product.priceCents)}</span>,
    <div key={`${product.id}-stock`}>
      <div style={styles.strongText}>{product.stockQuantity}</div>
      <div style={styles.metaText}>
        {!product.isActive ? 'Inactivo' : product.isAvailable ? 'Disponible' : 'Sin stock'}
      </div>
    </div>,
    <StatusBadge key={`${product.id}-active`} status={product.isActive ? 'ACTIVE' : 'INACTIVE'} />,
    <span key={`${product.id}-created`} style={styles.secondaryText}>{formatDate(product.createdAt)}</span>,
    <div key={`${product.id}-actions`} style={actionGroupLayout}>
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
            <Link to={routes.adminStorePublish} style={{ color: theme.colors.textMuted, textDecoration: 'none' }}>Volver a publicar</Link>
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
        <div role="alert" aria-live="assertive" style={{ marginTop: theme.spacing.lg }}>
          <ErrorAlert message={error} actionLabel="Reintentar" onAction={() => void loadCatalogData()} actionDisabled={loading} />
        </div>
      )}

      <Section title="Stores activas">
        <Card>
          {activeStores.length === 0 ? (
            <EmptyState title="No hay stores activas" description="Necesitas una membership activa para operar productos." />
          ) : (
            <div style={stackLayout}>
              {activeStores.map((membership) => (
                <div key={membership.storeId} style={styles.membershipRow}>
                  <div>
                    <div style={styles.strongText}>{membership.storeSlug}</div>
                    <div style={styles.metaText}>{membership.role}</div>
                  </div>
                  <div style={styles.mutedCell}>{membership.storeId}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </Section>

      <Section title={editingId ? (editMode === 'stock' ? 'Ajustar stock' : 'Editar producto') : 'Crear producto'}>
        <Card>
          <form onSubmit={(event) => void onSubmit(event)} style={formLayout}>
            {editingId && editMode === 'stock' ? (
              <Card variant="soft" style={styles.stockSummary}>
                <div style={stackLayout}>
                  <div style={styles.strongText}>{form.name || 'Producto STORE'}</div>
                  <div style={styles.metaText}>SKU: {form.sku || '-'}</div>
                  <div style={styles.metaText}>Precio actual: {form.priceCents ? formatMoneyFromCents(Number(form.priceCents)) : '-'}</div>
                </div>
              </Card>
            ) : (
              <>
                <FormField label="SKU" hint="Identificador interno único por store">
                  <TextInput
                    value={form.sku}
                    onChange={(event) => setForm((prev) => ({ ...prev, sku: event.target.value }))}
                    placeholder="SKU-CAFE"
                    aria-label="SKU"
                    autoComplete="off"
                  />
                </FormField>
                <FormField label="Nombre">
                  <TextInput
                    value={form.name}
                    onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                    placeholder="Cafe tostado"
                    aria-label="Nombre"
                  />
                </FormField>
                <FormField label="Precio en centavos" hint="Se mantiene el contrato actual de priceCents">
                  <TextInput
                    value={form.priceCents}
                    onChange={(event) => setForm((prev) => ({ ...prev, priceCents: event.target.value }))}
                    placeholder="1500"
                    aria-label="Precio en centavos"
                    inputMode="numeric"
                  />
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
              <TextInput
                value={form.stockQuantity}
                onChange={(event) => setForm((prev) => ({ ...prev, stockQuantity: event.target.value }))}
                placeholder="25"
                aria-label="Stock disponible"
                inputMode="numeric"
              />
            </FormField>
            <div style={actionGroupLayout}>
              <Button type="submit" disabled={saving} aria-busy={saving}>
                {editingId ? (editMode === 'stock' ? 'Guardar stock' : 'Guardar cambios') : 'Crear producto'}
              </Button>
              {editingId ? <Button variant="ghost" type="button" onClick={resetForm} disabled={saving}>Cancelar</Button> : null}
            </div>
          </form>
        </Card>
      </Section>

      <Section title="Categorías STORE">
        <Card>
          <div style={formLayout}>
            <form onSubmit={(event) => void onCreateCategory(event)} style={categoryFormLayout}>
              <FormField label="Nombre de categoría">
                <TextInput
                  value={categoryForm.name}
                  onChange={(event) => setCategoryForm((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="Bebidas"
                  aria-label="Nombre de categoría"
                />
              </FormField>
              <FormField label="Orden">
                <TextInput
                  value={categoryForm.sortOrder}
                  onChange={(event) => setCategoryForm((prev) => ({ ...prev, sortOrder: event.target.value }))}
                  placeholder="0"
                  aria-label="Orden"
                  inputMode="numeric"
                />
              </FormField>
              <Button type="submit" disabled={saving} aria-busy={saving}>Crear categoría</Button>
            </form>

            {sortedCategories.length === 0 ? (
              <div role="status" aria-live="polite">
                <EmptyState title="Todavía no hay categorías" description="Podés crear categorías simples y luego asignarlas a productos." />
              </div>
            ) : (
              <DataTable
                headers={['Nombre', 'Orden', 'Estado', 'Creada', 'Acciones']}
                rows={sortedCategories.map((category) => ([
                  <span key={`${category.id}-name`} style={styles.secondaryText}>{category.name}</span>,
                  <span key={`${category.id}-sort`} style={styles.secondaryText}>{category.sortOrder}</span>,
                  <StatusBadge key={`${category.id}-status`} status={category.active ? 'ACTIVE' : 'INACTIVE'} />,
                  <span key={`${category.id}-created`} style={styles.secondaryText}>{formatDate(category.createdAt)}</span>,
                  <div key={`${category.id}-actions`} style={actionGroupLayout}>
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
            <div role="status" aria-live="polite">
              <LoadingBlock label="Cargando productos..." />
            </div>
          ) : sortedProducts.length === 0 ? (
            <div role="status" aria-live="polite">
              <EmptyState title="Todavía no hay productos" description="Creá el primer producto para habilitar la gestión del catálogo store." />
            </div>
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
