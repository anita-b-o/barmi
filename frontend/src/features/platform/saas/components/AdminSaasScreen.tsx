import type { CSSProperties } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { saasAdminAdapter } from '@/api/adapters/saasAdminAdapter'
import type { SaasPlan, SaasPlanCreateReq, SaasSubscription, SaasSubscriptionStatus } from '@/api/contracts/v1/saasAdmin'
import { isApiError } from '@/api/client/errors'
import { useAuth } from '@/core/auth'
import { routes } from '@/core/constants/routes'
import { formatDate } from '@/core/utils/format'
import AdminLayout from '@/layouts/AdminLayout'
import { Breadcrumbs, ContextHeader } from '@/components/navigation'
import PageHeader from '@/components/navigation/SectionHeader'
import Section from '@/components/ui/Section'
import Button from '@/components/primitives/Button'
import DataTable from '@/components/primitives/Table'
import FormField from '@/components/forms/Field'
import TextInput from '@/components/primitives/Input'
import SelectField from '@/components/primitives/Select'
import ErrorAlert from '@/components/feedback/ErrorState'
import LoadingBlock from '@/components/feedback/LoadingState'
import ToastContainer from '@/components/feedback/ToastContainer'
import StatusBadge from '@/components/commerce/StatusBadge'
import { theme } from '@/app/theme'

type PlanFormState = {
  code: string
  name: string
  active: boolean
  description: string
  maxProducts: string
  analyticsEnabled: boolean
  seoEnabled: boolean
}

type ToastItem = {
  id: string
  message: string
  variant?: 'success' | 'error' | 'info'
}

const emptyPlanForm: PlanFormState = {
  code: '',
  name: '',
  active: true,
  description: '',
  maxProducts: '50',
  analyticsEnabled: false,
  seoEnabled: false
}

const statusOptions: { value: SaasSubscriptionStatus; label: string }[] = [
  { value: 'TRIAL', label: 'TRIAL' },
  { value: 'ACTIVE', label: 'ACTIVE' },
  { value: 'PAST_DUE', label: 'PAST_DUE' },
  { value: 'SUSPENDED', label: 'SUSPENDED' },
  { value: 'CANCELLED', label: 'CANCELLED' }
]

const styles = {
  formGrid: { display: 'grid', gap: theme.spacing.md, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' },
  checkboxRow: { display: 'flex', alignItems: 'center', gap: theme.spacing.sm, minHeight: 44, color: theme.colors.textPrimary },
  actionsRow: { display: 'flex', gap: theme.spacing.sm, flexWrap: 'wrap', alignItems: 'center' },
  inlineText: { color: theme.colors.textMuted, fontSize: theme.typography.small.size },
  tableText: { overflowWrap: 'anywhere' },
  panel: { display: 'grid', gap: theme.spacing.lg }
} satisfies Record<string, CSSProperties>

function toErrorMessage(error: unknown): string {
  if (isApiError(error)) return error.message
  if (error instanceof Error) return error.message
  return 'Error inesperado'
}

function boolLabel(value: boolean) {
  return value ? 'Sí' : 'No'
}

function planToForm(plan: SaasPlan): PlanFormState {
  return {
    code: plan.code,
    name: plan.name,
    active: plan.active,
    description: plan.description ?? '',
    maxProducts: String(plan.maxProducts),
    analyticsEnabled: plan.analyticsEnabled,
    seoEnabled: plan.seoEnabled
  }
}

export default function AdminSaasScreen() {
  const { me, logout, authRequest } = useAuth()
  const [plans, setPlans] = useState<SaasPlan[]>([])
  const [subscriptions, setSubscriptions] = useState<SaasSubscription[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null)
  const [planForm, setPlanForm] = useState<PlanFormState>(emptyPlanForm)
  const [selectedPlanByStore, setSelectedPlanByStore] = useState<Record<string, string>>({})
  const [selectedStatusByStore, setSelectedStatusByStore] = useState<Record<string, SaasSubscriptionStatus>>({})
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const addToast = (message: string, variant: ToastItem['variant'] = 'info') => {
    setToasts((prev) => [...prev, { id: `${Date.now()}-${Math.random()}`, message, variant }])
  }

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [plansData, subscriptionsData] = await Promise.all([
        saasAdminAdapter.listPlans(authRequest),
        saasAdminAdapter.listSubscriptions(authRequest)
      ])
      setPlans(plansData)
      setSubscriptions(subscriptionsData)
      setSelectedPlanByStore(Object.fromEntries(subscriptionsData.map((item) => [item.storeId, item.planCode])))
      setSelectedStatusByStore(Object.fromEntries(subscriptionsData.map((item) => [item.storeId, item.status])))
      setError(null)
    } catch (err) {
      setError(toErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [authRequest])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const planOptions = useMemo(() => plans.map((plan) => ({ value: plan.code, label: `${plan.code} - ${plan.name}` })), [plans])

  const resetPlanForm = () => {
    setEditingPlanId(null)
    setPlanForm(emptyPlanForm)
  }

  const submitPlan = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    const maxProducts = Number(planForm.maxProducts)
    if (!planForm.name.trim()) {
      setError('El nombre del plan es requerido')
      return
    }
    if (!editingPlanId && !planForm.code.trim()) {
      setError('El código del plan es requerido')
      return
    }
    if (!Number.isInteger(maxProducts) || maxProducts < 0) {
      setError('maxProducts debe ser un entero no negativo')
      return
    }

    const payload = {
      name: planForm.name.trim(),
      active: planForm.active,
      description: planForm.description.trim() || null,
      maxProducts,
      analyticsEnabled: planForm.analyticsEnabled,
      seoEnabled: planForm.seoEnabled
    }

    try {
      setSaving(true)
      if (editingPlanId) {
        await saasAdminAdapter.updatePlan(editingPlanId, payload, authRequest)
        addToast('Plan actualizado', 'success')
      } else {
        const createPayload: SaasPlanCreateReq = { ...payload, code: planForm.code.trim() }
        await saasAdminAdapter.createPlan(createPayload, authRequest)
        addToast('Plan creado', 'success')
      }
      resetPlanForm()
      await loadData()
    } catch (err) {
      const message = toErrorMessage(err)
      setError(message)
      addToast(message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const changeStorePlan = async (subscription: SaasSubscription) => {
    const planCode = selectedPlanByStore[subscription.storeId] ?? subscription.planCode
    const status = selectedStatusByStore[subscription.storeId] ?? subscription.status
    try {
      setSaving(true)
      setError(null)
      await saasAdminAdapter.changeStorePlan(subscription.storeId, { planCode, status }, authRequest)
      addToast('Suscripción actualizada', 'success')
      await loadData()
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
      <Breadcrumbs items={[{ label: 'Admin', href: routes.adminHome }, { label: 'SaaS' }]} />
      <PageHeader
        title="Planes SaaS"
        eyebrow="Platform admin"
        tone="admin"
        subtitle={me?.email}
        actions={<Button variant="ghost" onClick={logout}>Logout</Button>}
      />

      <ContextHeader
        badge="Administración"
        title="Planes y suscripciones"
        description="Persistencia operativa de planes, límites declarativos y asignación por store."
        tone="admin"
      />

      {error ? <ErrorAlert message={error} /> : null}
      {loading ? <LoadingBlock label="Cargando planes SaaS..." /> : null}

      <Section title={editingPlanId ? 'Editar plan' : 'Crear plan'}>
        <form onSubmit={submitPlan} style={styles.panel}>
          <div style={styles.formGrid}>
            <FormField label="Código">
              <TextInput
                value={planForm.code}
                disabled={Boolean(editingPlanId)}
                onChange={(event) => setPlanForm((prev) => ({ ...prev, code: event.target.value }))}
                placeholder="PRO"
              />
            </FormField>
            <FormField label="Nombre">
              <TextInput
                value={planForm.name}
                onChange={(event) => setPlanForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Pro"
              />
            </FormField>
            <FormField label="maxProducts">
              <TextInput
                type="number"
                min={0}
                value={planForm.maxProducts}
                onChange={(event) => setPlanForm((prev) => ({ ...prev, maxProducts: event.target.value }))}
                placeholder="50"
              />
            </FormField>
            <FormField label="Descripción">
              <TextInput
                value={planForm.description}
                onChange={(event) => setPlanForm((prev) => ({ ...prev, description: event.target.value }))}
                placeholder="Plan operativo"
              />
            </FormField>
            <label style={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={planForm.active}
                onChange={(event) => setPlanForm((prev) => ({ ...prev, active: event.target.checked }))}
              />
              Activo
            </label>
            <label style={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={planForm.analyticsEnabled}
                onChange={(event) => setPlanForm((prev) => ({ ...prev, analyticsEnabled: event.target.checked }))}
              />
              Analytics
            </label>
            <label style={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={planForm.seoEnabled}
                onChange={(event) => setPlanForm((prev) => ({ ...prev, seoEnabled: event.target.checked }))}
              />
              SEO
            </label>
          </div>
          <div style={styles.actionsRow}>
            <Button type="submit" disabled={saving}>{editingPlanId ? 'Guardar plan' : 'Crear plan'}</Button>
            {editingPlanId ? <Button type="button" variant="ghost" onClick={resetPlanForm}>Cancelar</Button> : null}
          </div>
        </form>
      </Section>

      <Section title="Planes">
        <DataTable
          headers={['Código', 'Nombre', 'Estado', 'Límites', 'Features', 'Actualizado', 'Acciones']}
          emptyMessage="Sin planes"
          rows={plans.map((plan) => [
            <strong style={styles.tableText}>{plan.code}</strong>,
            <span style={styles.tableText}>{plan.name}</span>,
            <StatusBadge status={plan.active ? 'ACTIVE' : 'INACTIVE'} />,
            <span>{plan.maxProducts} productos</span>,
            <span>{`Analytics: ${boolLabel(plan.analyticsEnabled)} · SEO: ${boolLabel(plan.seoEnabled)}`}</span>,
            <span>{formatDate(plan.updatedAt)}</span>,
            <Button type="button" variant="secondary" onClick={() => {
              setEditingPlanId(plan.id)
              setPlanForm(planToForm(plan))
            }}>Editar</Button>
          ])}
        />
      </Section>

      <Section title="Suscripciones">
        <DataTable
          headers={['Store', 'Plan', 'Status', 'Límites', 'Desde', 'Acciones']}
          emptyMessage="Sin suscripciones"
          rows={subscriptions.map((subscription) => [
            <div style={styles.tableText}>
              <strong>{subscription.storeName ?? subscription.storeSlug ?? subscription.storeId}</strong>
              <div style={styles.inlineText}>{subscription.storeSlug ?? subscription.storeId}</div>
            </div>,
            <SelectField
              aria-label={`Plan para ${subscription.storeSlug ?? subscription.storeId}`}
              value={selectedPlanByStore[subscription.storeId] ?? subscription.planCode}
              options={planOptions}
              onChange={(event) => setSelectedPlanByStore((prev) => ({ ...prev, [subscription.storeId]: event.target.value }))}
            />,
            <SelectField
              aria-label={`Status para ${subscription.storeSlug ?? subscription.storeId}`}
              value={selectedStatusByStore[subscription.storeId] ?? subscription.status}
              options={statusOptions}
              onChange={(event) => setSelectedStatusByStore((prev) => ({ ...prev, [subscription.storeId]: event.target.value as SaasSubscriptionStatus }))}
            />,
            <span>{`${subscription.maxProducts} productos · Analytics: ${boolLabel(subscription.analyticsEnabled)} · SEO: ${boolLabel(subscription.seoEnabled)}`}</span>,
            <span>{formatDate(subscription.startedAt)}</span>,
            <Button type="button" disabled={saving} onClick={() => void changeStorePlan(subscription)}>Cambiar plan</Button>
          ])}
        />
      </Section>

      <ToastContainer toasts={toasts} onClose={removeToast} />
    </AdminLayout>
  )
}
