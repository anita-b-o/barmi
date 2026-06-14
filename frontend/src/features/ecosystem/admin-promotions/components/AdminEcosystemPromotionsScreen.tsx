import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ecosystemAdminAdapter } from '../../../../api/adapters/ecosystemAdminAdapter'
import type { EcosystemPromotion, EcosystemPromotionCreateReq, EcosystemPromotionType } from '../../../../api/contracts/v1/ecosystemAdmin'
import { isApiError } from '../../../../api/client/errors'
import { theme } from '@/app/theme'
import { useAuth } from '@/core/auth/authContext'
import { routes } from '@/core/constants/routes'
import { formatDate, formatMoney } from '@/core/utils/format'
import EmptyState from '@/components/feedback/EmptyState'
import ErrorAlert from '@/components/feedback/ErrorState'
import LoadingBlock from '@/components/feedback/LoadingState'
import ToastContainer from '@/components/feedback/ToastContainer'
import Field from '@/components/forms/Field'
import { Breadcrumbs, ContextHeader } from '@/components/navigation'
import PageHeader from '@/components/navigation/SectionHeader'
import Button from '@/components/primitives/Button'
import Card from '@/components/primitives/Card'
import Input from '@/components/primitives/Input'
import SelectField from '@/components/primitives/Select'
import Table from '@/components/primitives/Table'
import Section from '@/components/ui/Section'
import StatusBadge from '@/components/commerce/StatusBadge'
import AdminLayout from '@/layouts/AdminLayout'

type PromotionFormState = {
  code: string
  type: EcosystemPromotionType
  value: string
  expirationDate: string
  usageLimit: string
}

type ToastItem = {
  id: string
  message: string
  variant?: 'success' | 'error' | 'info'
}

const initialForm: PromotionFormState = {
  code: '',
  type: 'FIXED',
  value: '',
  expirationDate: '',
  usageLimit: ''
}

function toErrorMessage(error: unknown): string {
  if (isApiError(error)) return error.message
  if (error instanceof Error) return error.message
  return 'Error inesperado'
}

export default function AdminEcosystemPromotionsScreen() {
  const { me, memberships, logout, authRequest } = useAuth()
  const activeEcosystems = memberships.ecosystems.filter((membership) => membership.status === 'ACTIVE')
  const [ecosystemId, setEcosystemId] = useState(activeEcosystems[0]?.ecosystemId ?? '')
  const [promotions, setPromotions] = useState<EcosystemPromotion[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<PromotionFormState>(initialForm)
  const [toasts, setToasts] = useState<ToastItem[]>([])

  useEffect(() => {
    if (!ecosystemId && activeEcosystems.length > 0) {
      setEcosystemId(activeEcosystems[0].ecosystemId)
    }
  }, [activeEcosystems, ecosystemId])

  const ecosystemOptions = useMemo(() => activeEcosystems.map((membership) => ({
    value: membership.ecosystemId,
    label: `${membership.ecosystemSlug} (${membership.role})`
  })), [activeEcosystems])

  const addToast = (message: string, variant: ToastItem['variant'] = 'info') => {
    const id = `${Date.now()}-${Math.random()}`
    setToasts((prev) => [...prev, { id, message, variant }])
  }

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }

  const loadPromotions = useCallback(async () => {
    if (!ecosystemId) {
      setPromotions([])
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      const data = await ecosystemAdminAdapter.listPromotions(ecosystemId, authRequest)
      setPromotions(data)
      setError(null)
    } catch (err) {
      setError(toErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [authRequest, ecosystemId])

  useEffect(() => {
    void loadPromotions()
  }, [loadPromotions])

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)

    if (!ecosystemId) {
      setError('Seleccioná un ecosystem activo')
      return
    }

    const code = form.code.trim()
    const value = Number(form.value)
    const usageLimit = form.usageLimit.trim() ? Number(form.usageLimit) : null

    if (!code) {
      setError('El código es requerido')
      return
    }
    if (Number.isNaN(value) || value <= 0) {
      setError('El valor debe ser mayor a cero')
      return
    }
    if (usageLimit !== null && (!Number.isInteger(usageLimit) || usageLimit < 0)) {
      setError('El límite de uso debe ser entero y no negativo')
      return
    }

    const payload: EcosystemPromotionCreateReq = {
      ecosystemId,
      code,
      type: form.type,
      value,
      active: true,
      expirationDate: form.expirationDate.trim() ? new Date(form.expirationDate).toISOString() : null,
      usageLimit
    }

    try {
      setSaving(true)
      await ecosystemAdminAdapter.createPromotion(payload, authRequest)
      setForm(initialForm)
      await loadPromotions()
      addToast('Promoción creada', 'success')
    } catch (err) {
      const message = toErrorMessage(err)
      setError(message)
      addToast(message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (promotion: EcosystemPromotion) => {
    try {
      setSaving(true)
      setError(null)
      await ecosystemAdminAdapter.updatePromotionActive(promotion.id, promotion.ecosystemId, !promotion.active, authRequest)
      await loadPromotions()
      addToast(promotion.active ? 'Promoción desactivada' : 'Promoción activada', 'success')
    } catch (err) {
      const message = toErrorMessage(err)
      setError(message)
      addToast(message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const rows = useMemo(() => promotions.map((promotion) => ([
    <div key={`${promotion.id}-code`}>
      <div style={{ fontWeight: 600 }}>{promotion.code}</div>
      <div style={{ color: theme.colors.textMuted, fontSize: theme.typography.small.size }}>{promotion.id}</div>
    </div>,
    <span key={`${promotion.id}-type`}>{promotion.type === 'FIXED' ? 'Monto fijo' : 'Porcentaje'}</span>,
    <span key={`${promotion.id}-value`}>
      {promotion.type === 'FIXED' ? formatMoney(promotion.value, 'ARS') : `${promotion.value}%`}
    </span>,
    <span key={`${promotion.id}-usage`}>
      {promotion.usageLimit === null ? `${promotion.usageCount} usos` : `${promotion.usageCount} / ${promotion.usageLimit}`}
    </span>,
    <span key={`${promotion.id}-expiration`}>{promotion.expirationDate ? formatDate(promotion.expirationDate) : 'Sin vencimiento'}</span>,
    <StatusBadge key={`${promotion.id}-active`} status={promotion.active ? 'ACTIVE' : 'INACTIVE'} />,
    <div key={`${promotion.id}-actions`} style={{ display: 'flex', gap: 8 }}>
      <Button variant="ghost" onClick={() => void toggleActive(promotion)} disabled={saving}>
        {promotion.active ? 'Desactivar' : 'Activar'}
      </Button>
    </div>
  ])), [promotions, saving])

  return (
    <AdminLayout>
      <Breadcrumbs items={[{ label: 'Admin', href: routes.adminHome }, { label: 'Ecosystem', href: routes.adminEcosystem }, { label: 'Promociones' }]} />
      <PageHeader
        title="Promociones ECOSYSTEM"
        subtitle={me?.email}
        actions={(
          <>
            <Link to={routes.adminEcosystem} style={{ color: theme.colors.textMuted, textDecoration: 'none' }}>Volver al hub</Link>
            <Button variant="ghost" onClick={logout}>Cerrar sesión</Button>
          </>
        )}
      />

      <ContextHeader
        badge="Descuentos MVP"
        title="Cupones simples con impacto real en checkout ecosystem"
        description="Administrá códigos fijos o porcentuales. El checkout valida estado, vencimiento y límite de uso desde backend."
      />

      {error ? (
        <div style={{ marginTop: theme.spacing.lg }}>
          <ErrorAlert message={error} actionLabel="Reintentar" onAction={() => void loadPromotions()} actionDisabled={loading} />
        </div>
      ) : null}

      <Section title="Ecosystems activos">
        <Card>
          {activeEcosystems.length === 0 ? (
            <EmptyState title="No hay ecosystems activos" description="Necesitás una membership activa para operar promociones." />
          ) : (
            <div style={{ display: 'grid', gap: theme.spacing.lg }}>
              <SelectField value={ecosystemId} onChange={(event) => setEcosystemId(event.target.value)} options={ecosystemOptions} />
              <div style={{ display: 'grid', gap: theme.spacing.md }}>
                {activeEcosystems.map((membership) => (
                  <div key={membership.ecosystemId} style={{ display: 'flex', justifyContent: 'space-between', gap: theme.spacing.lg, flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{membership.ecosystemSlug}</div>
                      <div style={{ color: theme.colors.textMuted, marginTop: 4 }}>{membership.role}</div>
                    </div>
                    <div style={{ color: theme.colors.textMuted }}>{membership.ecosystemId}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </Section>

      <Section title="Crear promoción">
        <Card>
          <form onSubmit={(event) => void onSubmit(event)} style={{ display: 'grid', gap: theme.spacing.lg }}>
            <div style={{ display: 'grid', gap: theme.spacing.lg, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
              <Field label="Código" helpText="Se normaliza en mayúsculas y debe ser único por ecosystem.">
                <Input value={form.code} onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))} placeholder="BIENVENIDA10" />
              </Field>
              <Field label="Tipo">
                <select
                  value={form.type}
                  onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value as EcosystemPromotionType }))}
                  style={{ padding: '10px 12px', borderRadius: theme.radius.md, border: `1px solid ${theme.colors.borderDefault}` }}
                >
                  <option value="FIXED">Monto fijo</option>
                  <option value="PERCENTAGE">Porcentaje</option>
                </select>
              </Field>
              <Field label="Valor" helpText={form.type === 'FIXED' ? 'Monto en ARS.' : 'Porcentaje entre 0 y 100.'}>
                <Input value={form.value} onChange={(event) => setForm((prev) => ({ ...prev, value: event.target.value }))} placeholder={form.type === 'FIXED' ? '500' : '10'} />
              </Field>
              <Field label="Vencimiento" helpText="Opcional. Si se completa, deja de aplicar al vencer.">
                <Input type="datetime-local" value={form.expirationDate} onChange={(event) => setForm((prev) => ({ ...prev, expirationDate: event.target.value }))} />
              </Field>
              <Field label="Límite de uso" helpText="Opcional. Dejalo vacío para ilimitado.">
                <Input value={form.usageLimit} onChange={(event) => setForm((prev) => ({ ...prev, usageLimit: event.target.value }))} placeholder="100" />
              </Field>
            </div>
            <div>
              <Button type="submit" disabled={saving || !ecosystemId}>{saving ? 'Guardando...' : 'Crear promoción'}</Button>
            </div>
          </form>
        </Card>
      </Section>

      <Section title="Promociones activas e históricas">
        <Card>
          {loading ? (
            <LoadingBlock label="Cargando promociones..." />
          ) : promotions.length === 0 ? (
            <EmptyState title="No hay promociones creadas" description="Creá el primer cupón para habilitar descuentos en checkout." />
          ) : (
            <Table headers={['Código', 'Tipo', 'Valor', 'Usos', 'Vencimiento', 'Estado', 'Acciones']} rows={rows} />
          )}
        </Card>
      </Section>

      <ToastContainer toasts={toasts} onClose={removeToast} />
    </AdminLayout>
  )
}
