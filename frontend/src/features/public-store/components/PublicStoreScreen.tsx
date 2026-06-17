import type { CSSProperties } from 'react'
import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import type { PublicStoreAppearancePreset, PublicStoreCatalogSort, PublicStorePromotion } from '../../../api/contracts/v1/public'
import { hasPublicStoreCapability } from '@/api/adapters/publicAdapter'
import { useCart } from '../../store/cart/cartContext'
import { usePublicStoreCatalog } from '../hooks/usePublicStoreCatalog'
import { routes } from '@/core/constants/routes'
import { formatMoneyFromCents } from '@/core/utils/format'
import { QuantitySelector } from '@/components/commerce'
import PublicStoreLayout from '@/layouts/PublicStoreLayout'
import { Breadcrumbs } from '@/components/navigation'
import Card from '@/components/primitives/Card'
import Button from '@/components/primitives/Button'
import Badge from '@/components/primitives/Badge'
import TextInput from '@/components/primitives/Input'
import SelectField from '@/components/primitives/Select'
import EmptyState from '@/components/feedback/EmptyState'
import ErrorAlert from '@/components/feedback/ErrorState'
import LoadingBlock from '@/components/feedback/LoadingState'
import { theme } from '@/app/theme'
import { useViewportMode } from '@/core/hooks/useViewportMode'
import { EcosystemHeroBadge, EcosystemHeroSection, EcosystemSurfaceSection } from '@/features/ecosystem'
import { trackBetaEvent } from '@/features/beta'
import { buildCanonicalUrl, useJsonLd, useSeoMetadata } from '@/core/seo'

const SORT_OPTIONS: Array<{ value: PublicStoreCatalogSort; label: string }> = [
  { value: 'default', label: 'Orden actual' },
  { value: 'name,asc', label: 'Nombre A-Z' },
  { value: 'name,desc', label: 'Nombre Z-A' },
  { value: 'price,asc', label: 'Precio menor' },
  { value: 'price,desc', label: 'Precio mayor' }
]

const SORT_VALUES = new Set<PublicStoreCatalogSort>(SORT_OPTIONS.map((option) => option.value))
const PRODUCT_PAGE_SIZE = 20
const FILTER_PARAM_KEYS = ['q', 'availableOnly', 'sort', 'categoryId', 'page'] as const

type CatalogUrlFilters = {
  query: string
  availableOnly: boolean
  sort: PublicStoreCatalogSort
  categoryId: string
  page: number
}

function readCatalogUrlFilters(params: URLSearchParams): CatalogUrlFilters {
  const sortParam = params.get('sort')
  const pageParam = Number(params.get('page') ?? '0')
  return {
    query: params.get('q')?.trim() ?? '',
    availableOnly: params.get('availableOnly') === 'true',
    sort: sortParam && SORT_VALUES.has(sortParam as PublicStoreCatalogSort) ? sortParam as PublicStoreCatalogSort : 'default',
    categoryId: params.get('categoryId')?.trim() ?? '',
    page: Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 0
  }
}

function writeCatalogUrlFilters(params: URLSearchParams, filters: CatalogUrlFilters) {
  const next = new URLSearchParams(params)
  FILTER_PARAM_KEYS.forEach((key) => next.delete(key))

  const query = filters.query.trim()
  const categoryId = filters.categoryId.trim()
  if (query) next.set('q', query)
  if (filters.availableOnly) next.set('availableOnly', 'true')
  if (filters.sort !== 'default') next.set('sort', filters.sort)
  if (categoryId) next.set('categoryId', categoryId)
  if (filters.page > 0) next.set('page', String(filters.page))

  return next
}

function catalogUrlFiltersEqual(a: CatalogUrlFilters, b: CatalogUrlFilters) {
  return a.query === b.query &&
    a.availableOnly === b.availableOnly &&
    a.sort === b.sort &&
    a.categoryId === b.categoryId &&
    a.page === b.page
}

function isOnlyCatalogQueryChange(current: CatalogUrlFilters, next: CatalogUrlFilters) {
  return current.query !== next.query &&
    current.availableOnly === next.availableOnly &&
    current.sort === next.sort &&
    current.categoryId === next.categoryId
}

function formatPromotionExpiry(promotion: PublicStorePromotion) {
  if (!promotion.expirationDate) return null
  return new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium' }).format(new Date(promotion.expirationDate))
}

const publicStoreStyles = {
  pageStack: { display: 'grid', gap: theme.spacing.xl, paddingBottom: theme.spacing.xxxl },
  heroMobile: { padding: theme.spacing.lg },
  heroDesktop: { padding: theme.spacing.xxl },
  surfaceMobile: { padding: theme.spacing.lg },
  surfaceDesktop: { padding: theme.spacing.xl },
  asideStack: { display: 'grid', gap: 6 },
  eyebrow: {
    fontSize: theme.typography.small.size,
    fontWeight: 700,
    letterSpacing: 0,
    color: theme.colors.textMuted,
    textTransform: 'uppercase'
  },
  titleText: {
    fontSize: theme.typography.title.size,
    fontWeight: 700,
    letterSpacing: 0,
    color: theme.colors.textPrimary
  },
  mutedCopy: { color: theme.colors.textMuted, lineHeight: 1.6 },
  compactMutedCopy: { color: theme.colors.textMuted, lineHeight: 1.5 },
  badgeRow: { display: 'flex', gap: theme.spacing.sm, flexWrap: 'wrap' },
  introBadgeRow: { display: 'flex', gap: theme.spacing.sm, flexWrap: 'wrap', marginBottom: theme.spacing.sm },
  sectionStack: { display: 'grid', gap: theme.spacing.lg },
  contentStack: { display: 'grid', gap: theme.spacing.xl },
  compactStack: { display: 'grid', gap: 6 },
  microStack: { display: 'grid', gap: 4 },
  contactGrid: { display: 'grid', gap: theme.spacing.md, gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', marginTop: theme.spacing.sm },
  contactItem: {
    display: 'grid',
    gap: 4,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    border: `1px solid ${theme.colors.borderDefault}`,
    background: theme.colors.bgSurfaceAlt
  },
  contactLink: { color: theme.colors.actionPrimary, fontWeight: 600, textDecoration: 'none', overflowWrap: 'anywhere' },
  promoGrid: { display: 'grid', gap: theme.spacing.md, gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))' },
  promoCard: {
    display: 'grid',
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
    borderRadius: theme.radius.lg,
    background: theme.colors.bgSurfaceAlt,
    border: `1px solid ${theme.colors.borderDefault}`
  },
  splitRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: theme.spacing.lg,
    alignItems: 'flex-end',
    flexWrap: 'wrap'
  },
  splitTopRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: theme.spacing.xl,
    alignItems: 'flex-start',
    flexWrap: 'wrap'
  },
  wrapEndRow: { display: 'flex', alignItems: 'center', gap: theme.spacing.sm, flexWrap: 'wrap', justifyContent: 'flex-end' },
  filterPanel: {
    display: 'grid',
    gap: theme.spacing.lg,
    padding: theme.spacing.lg,
    borderRadius: theme.radius.lg,
    background: theme.colors.bgSurfaceAlt,
    border: `1px solid ${theme.colors.borderDefault}`
  },
  filterHeader: { display: 'flex', justifyContent: 'space-between', gap: theme.spacing.md, alignItems: 'center', flexWrap: 'wrap' },
  filterControls: { display: 'grid', gap: theme.spacing.md, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', alignItems: 'end' },
  fieldLabel: { fontWeight: 600, marginBottom: theme.spacing.xs },
  categoryStack: { display: 'grid', gap: theme.spacing.sm },
  checkboxLabel: { display: 'flex', alignItems: 'center', gap: theme.spacing.sm, color: theme.colors.textMuted },
  productGrid: { display: 'grid', gap: theme.spacing.lg, gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))' },
  productCard: { padding: 0, overflow: 'hidden' },
  productCardActive: { padding: 0, overflow: 'hidden', borderColor: theme.colors.borderAccentSoft },
  productMediaWrap: {
    padding: theme.spacing.lg,
    borderBottom: `1px solid ${theme.colors.borderDefault}`,
    background: theme.colors.bgSurfaceAlt
  },
  productMedia: {
    minHeight: 118,
    borderRadius: theme.radius.md,
    border: `1px solid ${theme.colors.borderAccentSoft}`,
    background: theme.colors.bgSurfaceAlt,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: theme.colors.brand,
    fontWeight: 700,
    letterSpacing: 0,
    textTransform: 'uppercase'
  },
  productBody: { display: 'grid', gap: theme.spacing.lg, padding: theme.spacing.xl },
  productTitle: { fontWeight: 700, fontSize: 18, letterSpacing: 0, overflowWrap: 'anywhere' },
  productTitleLink: { color: theme.colors.textPrimary, textDecoration: 'none' },
  anywhereMuted: { color: theme.colors.textMuted, overflowWrap: 'anywhere' },
  productBuyRow: { display: 'flex', justifyContent: 'space-between', gap: theme.spacing.md, alignItems: 'flex-end', flexWrap: 'wrap' },
  priceLabel: { fontSize: theme.typography.small.size, color: theme.colors.textMuted, fontWeight: 600 },
  paginationRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.md, flexWrap: 'wrap' },
  warmSurface: { background: theme.colors.bgSurfaceAlt },
  cartTitleWrap: { display: 'grid', gap: 6, maxWidth: 760 },
  cartList: { display: 'grid', gap: theme.spacing.md },
  cartItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: theme.spacing.lg,
    flexWrap: 'wrap',
    padding: theme.spacing.lg,
    borderRadius: theme.radius.lg,
    border: `1px solid ${theme.colors.borderDefault}`,
    background: theme.colors.bgSurfaceAlt
  },
  cartItemContent: { minWidth: 0, flex: '1 1 220px' },
  cartItemName: { fontWeight: 600, overflowWrap: 'anywhere' },
  cartWarning: { color: theme.colors.error, marginTop: 4 },
  cartMeta: { color: theme.colors.textMuted, marginTop: 4 },
  quantityWrap: { marginLeft: 'auto' },
  totalRow: { display: 'flex', justifyContent: 'space-between', gap: theme.spacing.lg, alignItems: 'center', flexWrap: 'wrap' }
} satisfies Record<string, CSSProperties>

function appearanceAttribute(preset: PublicStoreAppearancePreset) {
  return preset.toLowerCase().replace('_', '-')
}

export default function PublicStoreScreen() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const cart = useCart()
  const viewportMode = useViewportMode()
  const isMobile = viewportMode === 'mobile'
  const initialUrlFilters = readCatalogUrlFilters(searchParams)
  const [searchQuery, setSearchQuery] = useState(initialUrlFilters.query)
  const [availableOnly, setAvailableOnly] = useState(initialUrlFilters.availableOnly)
  const [sort, setSort] = useState<PublicStoreCatalogSort>(initialUrlFilters.sort)
  const [categoryId, setCategoryId] = useState(initialUrlFilters.categoryId)
  const [page, setPage] = useState(initialUrlFilters.page)
  const skipNextUrlWriteRef = useRef(false)
  const trackedStoreViewRef = useRef<string | null>(null)
  const trackedListViewRef = useRef('')
  const trackedSearchRef = useRef('')
  const trackedNoResultsRef = useRef('')
  const normalizedSearchQuery = searchQuery.trim()
  const deferredSearchQuery = useDeferredValue(normalizedSearchQuery)
  const {
    store,
    products,
    productsPage,
    isInitialLoading,
    isFetchingProducts,
    isRetrying,
    productsEnabled,
    error,
    refetch
  } = usePublicStoreCatalog({
    slug,
    query: deferredSearchQuery,
    availableOnly,
    sort,
    categoryId,
    page,
    size: PRODUCT_PAGE_SIZE
  })
  const checkoutEnabled = hasPublicStoreCapability(store?.capabilities, 'CHECKOUT')
  const promotionsEnabled = hasPublicStoreCapability(store?.capabilities, 'PROMOTIONS')
  const aboutEnabled = hasPublicStoreCapability(store?.capabilities, 'ABOUT')
  const contactEnabled = hasPublicStoreCapability(store?.capabilities, 'CONTACT')
  const showCatalog = !error && store && productsEnabled
  const showPromotions = showCatalog && promotionsEnabled && checkoutEnabled && store.promotions.length > 0
  const showAbout = !error && store && aboutEnabled && Boolean(store.profile.description)
  const contactItems = store
    ? [
      store.profile.email ? { label: 'Email', value: store.profile.email, href: `mailto:${store.profile.email}` } : null,
      store.profile.phone ? { label: 'Teléfono', value: store.profile.phone, href: `tel:${store.profile.phone}` } : null,
      store.profile.whatsapp ? { label: 'WhatsApp', value: store.profile.whatsapp, href: null } : null
    ].filter((item): item is { label: string; value: string; href: string | null } => item !== null)
    : []
  const showContact = !error && store && contactEnabled && contactItems.length > 0
  const appearancePreset = store?.appearance ?? 'MODERN'
  const appearance = appearanceAttribute(appearancePreset)
  const isClassicAppearance = appearancePreset === 'CLASSIC'
  const isLocalBusinessAppearance = appearancePreset === 'LOCAL_BUSINESS'
  const isPortfolioAppearance = appearancePreset === 'PORTFOLIO'
  const contactHref = contactItems.find((item) => item.href)?.href
  const heroStyle = {
    ...(isMobile ? publicStoreStyles.heroMobile : publicStoreStyles.heroDesktop),
    ...(isClassicAppearance ? { border: `1px solid ${theme.colors.borderStrong}` } : null),
    ...(isPortfolioAppearance ? { paddingBottom: isMobile ? theme.spacing.lg : theme.spacing.xl } : null)
  }
  const surfaceStyle = {
    ...(isMobile ? publicStoreStyles.surfaceMobile : publicStoreStyles.surfaceDesktop),
    ...(isClassicAppearance ? { border: `1px solid ${theme.colors.borderStrong}`, padding: isMobile ? theme.spacing.md : theme.spacing.lg } : null)
  }
  const filterPanelStyle = {
    ...publicStoreStyles.filterPanel,
    ...(isClassicAppearance ? { padding: theme.spacing.md, borderColor: theme.colors.borderStrong } : null),
    ...(isPortfolioAppearance ? { background: theme.colors.bgSurface, borderColor: theme.colors.borderDefault } : null)
  }
  const productGridStyle = {
    ...publicStoreStyles.productGrid,
    ...(isPortfolioAppearance ? { gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))' } : null)
  }
  const productBodyStyle = {
    ...publicStoreStyles.productBody,
    ...(isClassicAppearance ? { padding: theme.spacing.lg, gap: theme.spacing.md } : null),
    ...(isPortfolioAppearance ? { padding: theme.spacing.lg } : null)
  }
  const totalPages = productsPage?.totalPages ?? 0
  const displayPage = totalPages > 0 ? Math.min(page + 1, totalPages) : 1
  const displayTotalPages = Math.max(totalPages, 1)
  const canGoPrevious = page > 0
  const canGoNext = totalPages > 0 && page < totalPages - 1
  const isOutOfRangePage = page > 0 &&
    products.length === 0 &&
    (productsPage?.totalPages ?? 0) > 0 &&
    (productsPage?.totalElements ?? 0) > 0

  const subtotalCents = useMemo(() => cart.items.reduce((sum, item) => sum + item.priceCents * item.qty, 0), [cart.items])
  const cartItemsCount = useMemo(() => cart.items.reduce((sum, item) => sum + item.qty, 0), [cart.items])
  const cartQtyByProductId = useMemo(() => Object.fromEntries(cart.items.map((item) => [item.productId, item.qty])), [cart.items])
  const productById = useMemo(() => new Map(products.map((product) => [product.id, product])), [products])
  const isCurrentStoreCart = cart.storeSlug === slug || cart.storeSlug === null
  const storeName = store?.name ?? 'Tienda'
  const primaryCategory = store?.categories[0]?.name
  useSeoMetadata({
    title: `${storeName} | Barmi`,
    description: primaryCategory
      ? `Compra productos de ${storeName}, tienda de ${primaryCategory}, en Barmi.`
      : `Compra productos de ${storeName} en Barmi.`,
    path: slug ? routes.publicStore(slug) : '/public'
  })
  const jsonLd = useMemo(() => store && slug ? {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Store',
        name: store.name,
        url: buildCanonicalUrl(routes.publicStore(slug)),
        ...(products.length > 0 ? {
          mainEntity: {
            '@type': 'ItemList',
            itemListElement: products.map((product, index) => ({
              '@type': 'ListItem',
              position: index + 1,
              item: {
                '@type': 'Thing',
                name: product.name
              }
            }))
          }
        } : {})
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Ecosystem',
            item: buildCanonicalUrl(routes.ecosystemHome)
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: store.name,
            item: buildCanonicalUrl(routes.publicStore(slug))
          }
        ]
      }
    ]
  } : null, [primaryCategory, products, slug, store])
  useJsonLd({
    id: slug ? `public-store-${slug}` : 'public-store',
    path: slug ? routes.publicStore(slug) : '/public',
    data: jsonLd
  })

  const aboutSection = showAbout ? (
    <EcosystemSurfaceSection style={surfaceStyle}>
      <div id="sobre-nosotros" style={publicStoreStyles.sectionStack}>
        <div style={publicStoreStyles.compactStack}>
          <div style={publicStoreStyles.titleText}>Sobre esta tienda</div>
          <div style={publicStoreStyles.mutedCopy}>
            {store.profile.description}
          </div>
        </div>
      </div>
    </EcosystemSurfaceSection>
  ) : null

  const contactSection = showContact ? (
    <EcosystemSurfaceSection tone={isLocalBusinessAppearance ? 'warm' : undefined} style={surfaceStyle}>
      <div id="contacto" style={publicStoreStyles.sectionStack}>
        <div style={publicStoreStyles.compactStack}>
          <div style={publicStoreStyles.splitRow}>
            <div style={publicStoreStyles.titleText}>Contacto</div>
            {isLocalBusinessAppearance && contactHref ? (
              <a href={contactHref} style={{ textDecoration: 'none' }}>
                <Button variant="primary">Contactar ahora</Button>
              </a>
            ) : null}
          </div>
          <div style={publicStoreStyles.contactGrid}>
            {contactItems.map((item) => (
              <div
                key={item.label}
                style={{
                  ...publicStoreStyles.contactItem,
                  ...(isClassicAppearance ? { borderColor: theme.colors.borderStrong, padding: theme.spacing.sm } : null)
                }}
              >
                <div style={publicStoreStyles.fieldLabel}>{item.label}</div>
                {item.href ? (
                  <a href={item.href} style={publicStoreStyles.contactLink}>{item.value}</a>
                ) : (
                  <div style={publicStoreStyles.anywhereMuted}>{item.value}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </EcosystemSurfaceSection>
  ) : null

  useEffect(() => {
    const nextFilters = readCatalogUrlFilters(searchParams)
    const changed = !catalogUrlFiltersEqual({
      query: searchQuery,
      availableOnly,
      sort,
      categoryId,
      page
    }, nextFilters)

    if (!changed) return
    skipNextUrlWriteRef.current = true
    setSearchQuery(nextFilters.query)
    setAvailableOnly(nextFilters.availableOnly)
    setSort(nextFilters.sort)
    setCategoryId(nextFilters.categoryId)
    setPage(nextFilters.page)
  }, [searchParams])

  useEffect(() => {
    if (skipNextUrlWriteRef.current) {
      skipNextUrlWriteRef.current = false
      return
    }

    const currentFilters = readCatalogUrlFilters(searchParams)
    const nextFilters = {
      query: searchQuery,
      availableOnly,
      sort,
      categoryId,
      page
    }
    const nextParams = writeCatalogUrlFilters(searchParams, {
      query: searchQuery,
      availableOnly,
      sort,
      categoryId,
      page
    })
    if (nextParams.toString() === searchParams.toString()) return
    setSearchParams(nextParams, { replace: isOnlyCatalogQueryChange(currentFilters, nextFilters) })
  }, [availableOnly, categoryId, page, searchParams, searchQuery, setSearchParams, sort])

  useEffect(() => {
    if (!store) return
    if (trackedStoreViewRef.current === store.id) return
    trackedStoreViewRef.current = store.id
    trackBetaEvent({
      eventName: 'store_view',
      storeId: store.id,
      storeSlug: store.slug,
      storeName: store.name
    })
  }, [store])

  useEffect(() => {
    if (!store || !productsEnabled || !productsPage || isFetchingProducts) return
    const signature = [
      store.slug,
      productsPage.page,
      productsPage.totalElements,
      deferredSearchQuery.trim().toLowerCase() ? 'query' : 'no-query',
      categoryId ? 'category' : 'all'
    ].join('|')
    if (trackedListViewRef.current === signature) return
    trackedListViewRef.current = signature

    trackBetaEvent({
      eventName: 'public_product_list_viewed',
      storeSlug: store.slug,
      metadata: {
        resultCount: String(productsPage.totalElements),
        hasQuery: deferredSearchQuery.trim() ? 'true' : 'false',
        categorySelected: categoryId ? 'true' : 'false',
        page: String(productsPage.page),
        surface: 'public_store_catalog'
      }
    })
  }, [categoryId, deferredSearchQuery, isFetchingProducts, productsEnabled, productsPage, store])

  useEffect(() => {
    const normalized = deferredSearchQuery.trim().toLowerCase()
    if (!normalized || !store || !productsEnabled || trackedSearchRef.current === normalized) return
    trackedSearchRef.current = normalized
    trackBetaEvent({
      eventName: 'search_used',
      storeId: store.id,
      storeSlug: store.slug,
      storeName: store.name,
      searchTerm: normalized,
      metadata: {
        surface: 'public_store_catalog'
      }
    })
  }, [deferredSearchQuery, productsEnabled, store])

  useEffect(() => {
    const normalized = deferredSearchQuery.trim().toLowerCase()
    if (!normalized || !store || !productsEnabled || isFetchingProducts || products.length > 0) return
    if (trackedNoResultsRef.current === normalized) return
    trackedNoResultsRef.current = normalized
    trackBetaEvent({
      eventName: 'search_no_results',
      storeId: store.id,
      storeSlug: store.slug,
      storeName: store.name,
      searchTerm: normalized,
      metadata: {
        surface: 'public_store_catalog'
      }
    })
  }, [deferredSearchQuery, isFetchingProducts, products.length, productsEnabled, store])

  if (!slug) return <PublicStoreLayout><ErrorAlert message="No pudimos abrir esta tienda." /></PublicStoreLayout>

  return (
    <PublicStoreLayout
      showCatalogNav={productsEnabled}
      showCheckoutNav={checkoutEnabled}
      storeName={store?.name}
      storeDescription={aboutEnabled ? store?.profile.description : null}
      capabilities={store?.capabilities}
    >
      <Breadcrumbs items={[{ label: store?.name ?? 'Inicio', href: routes.publicStore(slug) }, { label: productsEnabled ? 'Productos' : 'Información' }]} />

      <div id="inicio" data-appearance={appearance} style={{ ...publicStoreStyles.pageStack, gap: isClassicAppearance ? theme.spacing.lg : publicStoreStyles.pageStack.gap }}>
        <EcosystemHeroSection
          eyebrow={productsEnabled ? 'Tienda online' : 'Información'}
          title={store?.name ?? 'Tienda'}
          description={(aboutEnabled ? store?.profile.description : null) ?? (productsEnabled
            ? 'Conocé sus productos, disponibilidad y formas de contacto.'
            : 'Conocé más sobre esta tienda y sus canales de contacto.')}
          badges={(
            <>
              {primaryCategory ? <EcosystemHeroBadge>{primaryCategory}</EcosystemHeroBadge> : null}
              {productsEnabled ? <EcosystemHeroBadge variant="success">{products.length} producto{products.length === 1 ? '' : 's'}</EcosystemHeroBadge> : null}
              {checkoutEnabled ? <EcosystemHeroBadge>Carrito: {cartItemsCount} item{cartItemsCount === 1 ? '' : 's'}</EcosystemHeroBadge> : null}
              {store?.categories.length ? <EcosystemHeroBadge>{store.categories.length} categoría{store.categories.length === 1 ? '' : 's'}</EcosystemHeroBadge> : null}
            </>
          )}
          actions={!isMobile ? (
            <>
              {checkoutEnabled ? (
                <Button variant="primary" onClick={() => navigate(routes.storeCheckout)} disabled={cart.items.length === 0}>
                  Ir al carrito de la tienda{cartItemsCount > 0 ? ` (${cartItemsCount})` : ''}
                </Button>
              ) : null}
              <Button variant="secondary" onClick={() => navigate(routes.ecosystemStoresMap)}>
                Ver otras tiendas
              </Button>
              {isLocalBusinessAppearance && contactHref ? (
                <a href={contactHref} style={{ textDecoration: 'none' }}>
                  <Button variant="secondary">Contactar</Button>
                </a>
              ) : null}
            </>
          ) : undefined}
          aside={(
            <>
              <div style={publicStoreStyles.asideStack}>
                <div style={publicStoreStyles.eyebrow}>
                  Atención de la tienda
                </div>
                <div style={publicStoreStyles.titleText}>
                  {checkoutEnabled ? `Carrito de ${store?.name ?? 'esta tienda'}` : store?.name ?? 'Esta tienda'}
                </div>
                <div style={publicStoreStyles.mutedCopy}>
                  {checkoutEnabled
                    ? 'Los productos que agregues acá quedan listos para finalizar tu compra en esta tienda.'
                    : 'Encontrá la información principal y los canales de contacto disponibles.'}
                </div>
              </div>
              {checkoutEnabled ? (
                <Button variant="primary" onClick={() => navigate(routes.storeCheckout)} disabled={cart.items.length === 0}>
                  Ir al carrito de la tienda{cartItemsCount > 0 ? ` (${cartItemsCount})` : ''}
                </Button>
              ) : null}
              {isLocalBusinessAppearance && contactHref ? (
                <a href={contactHref} style={{ textDecoration: 'none' }}>
                  <Button variant="secondary">Contactar</Button>
                </a>
              ) : null}
              <Button variant="secondary" onClick={() => navigate(routes.ecosystemStoresMap)}>
                Ver otras tiendas
              </Button>
              <Button variant="ghost" onClick={() => navigate(routes.ecosystemStoresMap)}>
                Ver mapa de tiendas
              </Button>
            </>
          )}
          style={heroStyle}
        />

        <EcosystemSurfaceSection tone="warm" style={surfaceStyle}>
          <div style={publicStoreStyles.introBadgeRow}>
            {checkoutEnabled && cart.storeSlug && cart.storeSlug !== slug ? <Badge variant="warning">Tu carrito pertenece a otra tienda</Badge> : null}
          </div>
          <div style={publicStoreStyles.compactMutedCopy}>
            {checkoutEnabled
              ? 'Estás comprando en esta tienda. Revisá productos, cantidades y disponibilidad antes de avanzar.'
              : 'Esta tienda todavía no recibe compras por acá, pero podés consultar su información de contacto.'}
          </div>
        </EcosystemSurfaceSection>

        {isInitialLoading ? (
          <EcosystemSurfaceSection>
            <LoadingBlock label="Cargando tienda..." />
          </EcosystemSurfaceSection>
        ) : null}

        {error ? (
          <EcosystemSurfaceSection>
            <ErrorAlert
              message={error}
              actionLabel="Reintentar"
              onAction={refetch}
              actionDisabled={isRetrying}
            />
          </EcosystemSurfaceSection>
        ) : null}

        {isLocalBusinessAppearance ? contactSection : aboutSection}
        {isLocalBusinessAppearance ? aboutSection : contactSection}

        {showPromotions ? (
          <EcosystemSurfaceSection tone="warm">
            <div style={publicStoreStyles.sectionStack}>
              <div style={publicStoreStyles.compactStack}>
                <div style={publicStoreStyles.titleText}>
                  Promociones activas
                </div>
                <div style={publicStoreStyles.mutedCopy}>
                  Ingresá el código al finalizar la compra para ver el descuento aplicado sobre tu total.
                </div>
              </div>
              <div style={publicStoreStyles.promoGrid}>
                {store.promotions.map((promotion) => (
                  <div
                    key={promotion.code}
                    style={publicStoreStyles.promoCard}
                  >
                    <div style={publicStoreStyles.splitTopRow}>
                      <Badge variant="info">Promoción</Badge>
                      {formatPromotionExpiry(promotion) ? <Badge variant="neutral">Vence {formatPromotionExpiry(promotion)}</Badge> : null}
                    </div>
                    <div style={publicStoreStyles.microStack}>
                      <div style={publicStoreStyles.cartItemName}>{promotion.shortLabel}</div>
                      <div style={publicStoreStyles.anywhereMuted}>
                        Código: <strong>{promotion.code}</strong>
                      </div>
                    </div>
                    <Button variant="secondary" onClick={() => navigate(routes.storeCheckout)}>
                      Usar al comprar
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </EcosystemSurfaceSection>
        ) : null}

        {!error && store && !productsEnabled ? (
          <EcosystemSurfaceSection style={surfaceStyle}>
            <EmptyState
              title="Pronto habrá más para ver"
              description="Por ahora esta tienda comparte su información principal y sus canales de contacto."
              actionLabel="Ver otras tiendas"
              onAction={() => navigate(routes.ecosystemStoresMap)}
            />
          </EcosystemSurfaceSection>
        ) : null}

        {showCatalog ? (
          <EcosystemSurfaceSection>
            <div id="productos" style={publicStoreStyles.contentStack}>
              <div
                style={publicStoreStyles.splitRow}
              >
                <div style={publicStoreStyles.compactStack}>
                  <div style={publicStoreStyles.titleText}>
                    Productos
                  </div>
                  <div style={publicStoreStyles.compactMutedCopy}>
                    Mirá disponibilidad, precios y categorías antes de agregar productos al carrito.
                  </div>
                </div>
                <div style={publicStoreStyles.wrapEndRow}>
                  {checkoutEnabled ? (
                    <span style={publicStoreStyles.anywhereMuted}>
                      Subtotal actual: <strong style={publicStoreStyles.titleText}>{formatMoneyFromCents(subtotalCents)}</strong>
                    </span>
                  ) : null}
                  {isFetchingProducts ? <Badge variant="neutral">Actualizando catálogo</Badge> : null}
                </div>
              </div>

              <div
                style={filterPanelStyle}
              >
                <div style={publicStoreStyles.filterHeader}>
                  <div>
                    <div style={publicStoreStyles.cartItemName}>Explorar catálogo</div>
                    <div style={publicStoreStyles.cartMeta}>
                      {products.length} resultado{products.length === 1 ? '' : 's'} visibles con la configuración actual.
                    </div>
                  </div>
                  <Badge variant="neutral">{availableOnly ? 'Solo disponibles' : 'Todo el catálogo visible'}</Badge>
                </div>

                <div style={publicStoreStyles.filterControls}>
                  <div>
                    <div style={publicStoreStyles.fieldLabel}>Buscar</div>
                    <TextInput
                      value={searchQuery}
                      onChange={(event) => {
                        setSearchQuery(event.target.value)
                        setPage(0)
                      }}
                      placeholder="Ej. combo, café, SKU-123"
                      aria-label="Buscar productos"
                    />
                  </div>
                  <div>
                    <div style={publicStoreStyles.fieldLabel}>Ordenar</div>
                    <SelectField
                      value={sort}
                      onChange={(event) => {
                        setSort(event.target.value as PublicStoreCatalogSort)
                        setPage(0)
                      }}
                      options={SORT_OPTIONS}
                      aria-label="Ordenar productos"
                    />
                  </div>
                </div>

                {store && store.categories.length > 0 ? (
                  <div style={publicStoreStyles.categoryStack}>
                    <div style={publicStoreStyles.fieldLabel}>Categoría</div>
                    <SelectField
                      value={categoryId}
                      onChange={(event) => {
                        setCategoryId(event.target.value)
                        setPage(0)
                      }}
                      options={[
                        { value: '', label: 'Todas las categorías' },
                        ...store.categories.map((category) => ({ value: category.id, label: category.name }))
                      ]}
                      aria-label="Filtrar por categoría"
                    />
                    <div style={publicStoreStyles.badgeRow}>
                      <Button type="button" variant={categoryId === '' ? 'primary' : 'secondary'} onClick={() => {
                        setCategoryId('')
                        setPage(0)
                      }}>
                        Todas
                      </Button>
                      {store.categories.slice(0, 4).map((category) => (
                        <Button
                          key={category.id}
                          type="button"
                          variant={categoryId === category.id ? 'primary' : 'secondary'}
                          onClick={() => {
                            setCategoryId(category.id)
                            setPage(0)
                          }}
                        >
                          {category.name}
                        </Button>
                      ))}
                    </div>
                  </div>
                ) : null}

                <label style={publicStoreStyles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={availableOnly}
                    onChange={(event) => {
                      setAvailableOnly(event.target.checked)
                      setPage(0)
                    }}
                    aria-label="Solo disponibles"
                  />
                  Solo disponibles
                </label>

                <div style={publicStoreStyles.compactMutedCopy}>
                  Si no encontrás algo, probá con otra búsqueda o limpiá los filtros.
                </div>
              </div>

              {isOutOfRangePage ? (
                <EmptyState
                  title="Esta página no tiene productos"
                  description="Los filtros se mantienen. Podés volver al inicio de estos resultados para seguir explorando."
                  actionLabel="Volver a la primera página"
                  onAction={() => setPage(0)}
                />
              ) : products.length === 0 ? (
                <EmptyState
                  title={searchQuery.trim() || availableOnly || sort !== 'default' || categoryId
                    ? 'No hay productos para esos filtros'
                    : 'No hay productos disponibles'}
                  description={searchQuery.trim() || availableOnly || sort !== 'default' || categoryId
                    ? 'Probá otra búsqueda o quitá filtros para ver más opciones.'
                    : 'La tienda todavía está preparando su catálogo. Volvé a consultar más adelante o usá sus canales de contacto.'}
                />
              ) : (
                <div style={productGridStyle}>
                  {products.map((product) => {
                    const cartQty = cartQtyByProductId[product.id] ?? 0

                    return (
                    <Card
                      key={product.id}
                      variant={product.isAvailable ? 'surface' : 'soft'}
                      style={cartQty > 0 ? publicStoreStyles.productCardActive : publicStoreStyles.productCard}
                    >
                      <div
                        style={publicStoreStyles.productMediaWrap}
                      >
                        <div
                          aria-hidden="true"
                          style={publicStoreStyles.productMedia}
                        >
                          Producto
                        </div>
                      </div>

                      <div style={productBodyStyle}>
                        <div style={publicStoreStyles.badgeRow}>
                          {product.categoryName ? <Badge variant="info">{product.categoryName}</Badge> : null}
                          <Badge variant={product.isAvailable ? 'success' : 'error'}>
                            {product.isAvailable ? `Disponible ahora · Stock disponible: ${product.stockQuantity}` : 'Sin stock disponible'}
                          </Badge>
                          {cartQty > 0 ? <Badge variant="success">En carrito: {cartQty}</Badge> : null}
                        </div>

                        <div style={publicStoreStyles.compactStack}>
                          <div style={publicStoreStyles.productTitle}>
                            <Link
                              to={routes.publicStoreProduct(slug, product.slug)}
                              style={publicStoreStyles.productTitleLink}
                              onClick={() => {
                                trackBetaEvent({
                                  eventName: 'public_product_card_clicked',
                                  storeSlug: store.slug,
                                  productSlug: product.slug,
                                  metadata: {
                                    source: 'public_store_catalog'
                                  }
                                })
                              }}
                            >
                              {product.name}
                            </Link>
                          </div>
                          <div style={publicStoreStyles.anywhereMuted}>SKU: {product.sku}</div>
                          <div style={publicStoreStyles.mutedCopy}>
                            {product.isAvailable
                              ? 'Disponible para agregar al carrito.'
                              : 'Se mantiene visible para referencia, pero no se puede agregar al carrito.'}
                          </div>
                        </div>

                        <div style={publicStoreStyles.productBuyRow}>
                          <div style={publicStoreStyles.microStack}>
                            <div style={publicStoreStyles.priceLabel}>
                              Precio
                            </div>
                            <div style={publicStoreStyles.titleText}>
                              {formatMoneyFromCents(product.priceCents)}
                            </div>
                          </div>
                          {checkoutEnabled ? (
                            <Button
                              variant="primary"
                              disabled={!product.isAvailable}
                              onClick={() => {
                                trackBetaEvent({
                                  eventName: 'product_click',
                                  storeId: store?.id,
                                  storeSlug: store?.slug,
                                  storeName: store?.name,
                                  productSlug: product.slug,
                                  metadata: {
                                    surface: 'public_store_catalog'
                                  }
                                })
                                cart.addItem(slug, { productId: product.id, name: product.name, priceCents: product.priceCents })
                              }}
                            >
                              {product.isAvailable ? 'Agregar' : 'Sin stock'}
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </Card>
                    )
                  })}
                </div>
              )}

              <div style={publicStoreStyles.paginationRow}>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={!canGoPrevious}
                  onClick={() => setPage((current) => Math.max(0, current - 1))}
                >
                  Anterior
                </Button>
                <span style={publicStoreStyles.anywhereMuted}>
                  Página {displayPage} de {displayTotalPages}
                </span>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={!canGoNext}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          </EcosystemSurfaceSection>
        ) : null}

        {checkoutEnabled ? (
        <EcosystemSurfaceSection
          tone="warm"
          style={publicStoreStyles.warmSurface}
        >
          <div
            style={publicStoreStyles.splitTopRow}
          >
            <div style={publicStoreStyles.cartTitleWrap}>
              <div style={publicStoreStyles.titleText}>
                Carrito de {store?.name ?? 'la tienda'}
              </div>
              <div style={publicStoreStyles.mutedCopy}>
                Podés seguir agregando productos o avanzar cuando tengas todo listo.
              </div>
            </div>
            <div style={publicStoreStyles.badgeRow}>
              <Badge variant="neutral">{isCurrentStoreCart ? 'Carrito de esta tienda' : 'Hay productos de otra tienda en el carrito'}</Badge>
            </div>
          </div>

          <div style={{ display: 'grid', gap: theme.spacing.lg, marginTop: theme.spacing.xl }}>
            {cart.items.length === 0 ? (
              <EmptyState
                title="Carrito vacío"
                description="Todavía no agregaste productos. Podés seguir mirando el catálogo."
                actionLabel="Seguir comprando en la tienda"
                onAction={() => navigate(routes.publicStore(slug))}
              />
            ) : (
              <div style={publicStoreStyles.cartList}>
                {cart.items.map((item) => {
                  const product = productById.get(item.productId)
                  const disableIncrease = product ? !product.isAvailable || item.qty >= product.stockQuantity : false

                  return (
                    <div
                      key={item.productId}
                      style={publicStoreStyles.cartItem}
                    >
                      <div style={publicStoreStyles.cartItemContent}>
                        <div style={publicStoreStyles.cartItemName}>{item.name}</div>
                        <div style={publicStoreStyles.anywhereMuted}>
                          {item.qty} x {formatMoneyFromCents(item.priceCents)}
                        </div>
                        {(() => {
                          if (!product) return null
                          if (!product.isAvailable) {
                            return <div style={publicStoreStyles.cartWarning}>Este producto quedó sin stock.</div>
                          }
                          if (item.qty >= product.stockQuantity) {
                            return <div style={publicStoreStyles.cartMeta}>Máximo disponible en catálogo: {product.stockQuantity}</div>
                          }
                          return null
                        })()}
                      </div>
                      <div style={publicStoreStyles.quantityWrap}>
                        <QuantitySelector
                          value={item.qty}
                          onDecrease={() => cart.removeItem(item.productId)}
                          onIncrease={() => cart.addItem(slug, { productId: item.productId, name: item.name, priceCents: item.priceCents })}
                          disableIncrease={disableIncrease}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            <div style={publicStoreStyles.totalRow}>
              <div style={publicStoreStyles.microStack}>
                <div style={publicStoreStyles.anywhereMuted}>Subtotal</div>
                <div style={publicStoreStyles.titleText}>
                  {formatMoneyFromCents(subtotalCents)}
                </div>
              </div>
              <div style={publicStoreStyles.badgeRow}>
                <Button variant="secondary" onClick={() => navigate(routes.publicStore(slug))}>
                  Seguir comprando en tienda
                </Button>
                <Button variant="primary" disabled={cart.items.length === 0} onClick={() => navigate(routes.storeCheckout)}>
                  Finalizar compra
                </Button>
              </div>
            </div>
          </div>
        </EcosystemSurfaceSection>
        ) : null}
      </div>
    </PublicStoreLayout>
  )
}
