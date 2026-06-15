import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { storeAdminAdapter } from '@/api/adapters/storeAdminAdapter'
import type { StoreCapability, StoreCapabilityMetadata } from '@/api/contracts/v1/storeAdmin'
import { theme } from '@/app/theme'
import { useAuth } from '@/core/auth/authContext'
import { routes } from '@/core/constants/routes'
import AdminLayout from '@/layouts/AdminLayout'
import Button from '@/components/primitives/Button'
import Card from '@/components/primitives/Card'
import Badge from '@/components/primitives/Badge'
import EmptyState from '@/components/feedback/EmptyState'
import ErrorState from '@/components/feedback/ErrorState'
import LoadingState from '@/components/feedback/LoadingState'
import Section from '@/components/ui/Section'
import { Breadcrumbs, ContextHeader } from '@/components/navigation'
import PageHeader from '@/components/navigation/SectionHeader'

const preferredOrder: StoreCapability[] = [
  'ABOUT',
  'GALLERY',
  'BLOG',
  'PRODUCTS',
  'RESERVATIONS',
  'PROMOTIONS',
  'SHIPPING',
  'CHECKOUT',
  'CONTACT'
]

function sortCapabilities(available: StoreCapabilityMetadata[]) {
  return [...available].sort((a, b) => preferredOrder.indexOf(a.key) - preferredOrder.indexOf(b.key))
}

function toErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message
  }
  return 'No se pudo completar la acción.'
}

export default function AdminStoreModulesScreen() {
  const { me, memberships, logout, authRequest } = useAuth()
  const activeStores = memberships.stores.filter((membership) => membership.status === 'ACTIVE')
  const [available, setAvailable] = useState<StoreCapabilityMetadata[]>([])
  const [enabled, setEnabled] = useState<Set<StoreCapability>>(new Set())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const sortedAvailable = useMemo(() => sortCapabilities(available), [available])

  useEffect(() => {
    let cancelled = false
    async function loadCapabilities() {
      try {
        setLoading(true)
        setError(null)
        const data = await storeAdminAdapter.getStoreCapabilities(authRequest)
        if (cancelled) return
        setAvailable(data.available)
        setEnabled(new Set(data.enabled))
      } catch (err) {
        if (!cancelled) setError(toErrorMessage(err))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadCapabilities()
    return () => {
      cancelled = true
    }
  }, [authRequest])

  const toggleCapability = (key: StoreCapability) => {
    setSuccess(null)
    setEnabled((current) => {
      const next = new Set(current)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    try {
      setSaving(true)
      setError(null)
      setSuccess(null)
      const selected = preferredOrder.filter((key) => enabled.has(key))
      const data = await storeAdminAdapter.updateStoreCapabilities({ enabled: selected }, authRequest)
      setAvailable(data.available)
      setEnabled(new Set(data.enabled))
      setSuccess('Partes de tu tienda guardadas.')
    } catch (err) {
      setError(toErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminLayout>
      <Breadcrumbs items={[{ label: 'Admin', href: routes.adminHome }, { label: 'Store', href: routes.adminStore }, { label: 'Modulos' }]} />
      <PageHeader
        title="Partes de tu tienda"
        eyebrow="Store admin"
        tone="store"
        subtitle={me?.email}
        actions={<Button variant="ghost" onClick={logout}>Cerrar sesión</Button>}
      />

      <ContextHeader
        badge="Presencia modular"
        title="Elegí qué querés mostrar en tu tienda pública."
        description="Podés cambiarlo más adelante. Esta configuración prepara la experiencia pública sin bloquear flujos comerciales todavía."
        tone="store"
      />

      <Section title="Store actual">
        <Card>
          {activeStores.length === 0 ? (
            <EmptyState title="No hay stores activas" description="Necesitas una membership activa para configurar módulos." />
          ) : (
            <div style={{ display: 'grid', gap: theme.spacing.md }}>
              {activeStores.map((membership) => (
                <div
                  key={membership.storeId}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: theme.spacing.md,
                    flexWrap: 'wrap',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700 }}>{membership.storeSlug}</div>
                    <div style={{ color: theme.colors.textMuted }}>{membership.role}</div>
                  </div>
                  <Badge variant="neutral">{membership.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </Section>

      <Section title="Qué mostrar">
        <Card>
          {loading ? (
            <LoadingState label="Cargando módulos de tienda..." />
          ) : error && available.length === 0 ? (
            <ErrorState message={error} />
          ) : (
            <form onSubmit={onSubmit} style={{ display: 'grid', gap: theme.spacing.lg }}>
              {error ? <ErrorState message={error} /> : null}
              {success ? (
                <div role="status" style={{ color: theme.colors.success, fontWeight: 700 }}>
                  {success}
                </div>
              ) : null}

              <div style={{ display: 'grid', gap: theme.spacing.md, gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
                {sortedAvailable.map((capability) => {
                  const checked = enabled.has(capability.key)
                  return (
                    <label
                      key={capability.key}
                      style={{
                        display: 'grid',
                        gap: theme.spacing.sm,
                        padding: theme.spacing.lg,
                        border: `1px solid ${checked ? theme.colors.actionPrimary : theme.colors.borderDefault}`,
                        borderRadius: theme.radius.md,
                        background: checked ? theme.colors.bgAccentSoft : theme.colors.bgSurface,
                        cursor: 'pointer'
                      }}
                    >
                      <span style={{ display: 'flex', justifyContent: 'space-between', gap: theme.spacing.md, alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, color: theme.colors.textPrimary }}>{capability.label}</span>
                        <input
                          aria-label={capability.label}
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleCapability(capability.key)}
                          style={{ width: 20, height: 20, accentColor: theme.colors.actionPrimary }}
                        />
                      </span>
                      <span style={{ color: theme.colors.textMuted, lineHeight: 1.45 }}>{capability.description}</span>
                    </label>
                  )
                })}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', gap: theme.spacing.md, flexWrap: 'wrap', alignItems: 'center' }}>
                <Link to={routes.adminStore} style={{ textDecoration: 'none' }}>
                  <Button type="button" variant="ghost">Volver al hub</Button>
                </Link>
                <Button type="submit" variant="primary" disabled={saving} aria-busy={saving}>
                  {saving ? 'Guardando...' : 'Guardar módulos'}
                </Button>
              </div>
            </form>
          )}
        </Card>
      </Section>
    </AdminLayout>
  )
}
