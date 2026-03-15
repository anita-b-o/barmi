import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { storeAdapter } from '../../api/adapters/storeAdapter'
import { isApiError } from '../../api/client/errors'
import type { StoreOrdersPage } from '../../api/contracts/v1/store'
import { formatDate, formatMoney } from '../utils/format'
import PlatformLayout from '../layout/PlatformLayout'
import PageHeader from '../components/PageHeader'
import Section from '../components/Section'
import DetailCard from '../components/DetailCard'
import StatusBadge from '../components/StatusBadge'
import LoadingBlock from '../components/LoadingBlock'
import ErrorAlert from '../components/ErrorAlert'
import EmptyState from '../components/EmptyState'
import { theme } from '../theme/theme'

export default function OrdersListScreen() {
  const [data, setData] = useState<StoreOrdersPage | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    storeAdapter.listOrders()
      .then((res) => {
        if (!active) return
        setData(res)
      })
      .catch((err: unknown) => {
        if (!active) return
        if (isApiError(err) && err.code === 'store_context_required') {
          setError('Store context required. Abrí el FE en http://demo-store.example.com:5173')
          return
        }
        setError(err instanceof Error ? err.message : 'Error cargando órdenes')
      })
      .finally(() => {
        if (!active) return
        setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  return (
    <PlatformLayout>
      <PageHeader
        title="Mis órdenes"
        subtitle="Abrí el detalle para seguir órdenes pendientes de pago o revisar órdenes ya cerradas."
        actions={<Link to="/public/demo-store" style={{ color: theme.colors.primary, textDecoration: 'none' }}>Volver a tienda</Link>}
      />

      {loading && <LoadingBlock label="Cargando órdenes..." />}
      {error && <ErrorAlert message={error} />}

      {data && (
        <Section title="Órdenes">
          {data.content.length === 0 && <EmptyState title="No hay órdenes." />}
          <div style={{ display: 'grid', gap: theme.spacing.lg }}>
            {data.content.map((order) => (
              <DetailCard key={order.orderId}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: theme.spacing.lg }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{order.orderId}</div>
                    <div style={{ color: theme.colors.textMuted, marginTop: 4 }}>{formatDate(order.createdAt)}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div><StatusBadge status={order.status} /></div>
                    <div style={{ marginTop: 8, fontWeight: 600 }}>{formatMoney(order.totalAmount, order.currency)}</div>
                  </div>
                </div>
                <div style={{ marginTop: theme.spacing.lg }}>
                  <Link to={`/store/orders/${order.orderId}`} style={{ color: theme.colors.primary, textDecoration: 'none' }}>
                    {order.status === 'PENDING_PAYMENT' ? 'Seguir pago' : 'Ver detalle'}
                  </Link>
                </div>
              </DetailCard>
            ))}
          </div>
        </Section>
      )}
    </PlatformLayout>
  )
}
