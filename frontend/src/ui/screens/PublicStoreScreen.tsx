import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { publicAdapter } from '../../api/adapters/publicAdapter'
import type { PublicProduct, PublicStore } from '../../api/contracts/v1/public'
import { useCart } from '../state/cartContext'
import { formatMoneyFromCents } from '../utils/format'
import PlatformLayout from '../layout/PlatformLayout'
import PageHeader from '../components/PageHeader'
import Section from '../components/Section'
import Card from '../components/Card'
import Button from '../components/Button'
import EmptyState from '../components/EmptyState'
import ErrorAlert from '../components/ErrorAlert'
import LoadingBlock from '../components/LoadingBlock'
import { theme } from '../theme/theme'

export default function PublicStoreScreen() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const cart = useCart()
  const [store, setStore] = useState<PublicStore | null>(null)
  const [products, setProducts] = useState<PublicProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    const storeSlug = slug ?? ''
    setLoading(true)
    setError(null)
    Promise.all([publicAdapter.getStore(storeSlug), publicAdapter.getProducts(storeSlug)])
      .then(([storeData, productsData]) => {
        if (!active) return
        setStore(storeData)
        setProducts(productsData)
      })
      .catch((err: unknown) => {
        if (!active) return
        setError(err instanceof Error ? err.message : 'Error cargando store')
      })
      .finally(() => {
        if (!active) return
        setLoading(false)
      })

    return () => {
      active = false
    }
  }, [slug])

  const subtotalCents = useMemo(() => {
    return cart.items.reduce((sum, item) => sum + item.priceCents * item.qty, 0)
  }, [cart.items])

  if (!slug) return <PlatformLayout><ErrorAlert message="Slug requerido." /></PlatformLayout>

  return (
    <PlatformLayout>
      <PageHeader
        title={store?.name ?? 'Store'}
        subtitle={`Slug: ${slug}`}
        actions={(
          <>
            <Link to="/store/orders" style={{ color: theme.colors.primary, textDecoration: 'none' }}>Mis órdenes</Link>
            <Link to="/ecosystem" style={{ color: theme.colors.primary, textDecoration: 'none' }}>Ecosystem</Link>
          </>
        )}
      />

      {loading && <LoadingBlock label="Cargando store..." />}
      {error && <ErrorAlert message={error} />}

      <Section title="Productos">
        {products.length === 0 && !loading ? (
          <EmptyState title="No hay productos disponibles" />
        ) : (
          <div style={{ display: 'grid', gap: theme.spacing.lg }}>
            {products.map((product) => (
              <Card key={product.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: theme.spacing.lg, alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 18 }}>{product.name}</div>
                    <div style={{ color: theme.colors.textMuted, marginTop: 6 }}>SKU: {product.sku}</div>
                    <div style={{ marginTop: 10, fontWeight: 600 }}>{formatMoneyFromCents(product.priceCents)}</div>
                  </div>
                  <Button
                    variant="primary"
                    onClick={() => cart.addItem(slug, { productId: product.id, name: product.name, priceCents: product.priceCents })}
                  >
                    Agregar
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Section>

      <Section title="Carrito">
        <Card variant="soft">
          {cart.items.length === 0 && <EmptyState title="Carrito vacío." />}
          {cart.items.length > 0 && (
            <div style={{ display: 'grid', gap: theme.spacing.md }}>
              {cart.items.map((item) => (
                <div key={item.productId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: theme.spacing.lg }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{item.name}</div>
                    <div style={{ color: theme.colors.textMuted }}>
                      {item.qty} x {formatMoneyFromCents(item.priceCents)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <Button variant="secondary" onClick={() => cart.removeItem(item.productId)}>-</Button>
                    <span style={{ minWidth: 20, textAlign: 'center' }}>{item.qty}</span>
                    <Button
                      variant="secondary"
                      onClick={() => cart.addItem(slug, { productId: item.productId, name: item.name, priceCents: item.priceCents })}
                    >
                      +
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div style={{ marginTop: theme.spacing.lg, fontWeight: 700 }}>Subtotal: {formatMoneyFromCents(subtotalCents)}</div>
          <div style={{ marginTop: theme.spacing.lg }}>
            <Button
              variant="primary"
              disabled={cart.items.length === 0}
              onClick={() => navigate('/store/checkout')}
            >
              Ir a checkout
            </Button>
          </div>
        </Card>
      </Section>
    </PlatformLayout>
  )
}
