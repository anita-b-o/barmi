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
import Card from '@/components/primitives/Card'
import Button from '@/components/primitives/Button'
import Badge from '@/components/primitives/Badge'
import TextInput from '@/components/primitives/Input'
import SelectField from '@/components/primitives/Select'
import EmptyState from '@/components/feedback/EmptyState'
import ErrorAlert from '@/components/feedback/ErrorState'
import LoadingBlock from '@/components/feedback/LoadingState'
import { alpha, theme } from '@/app/theme'
import { useViewportMode } from '@/core/hooks/useViewportMode'
import { trackBetaEvent } from '@/features/beta'
import { buildCanonicalUrl, useJsonLd, useSeoMetadata } from '@/core/seo'
import { normalizeStoreBranding, storeBrandingCssVariables } from '@/features/store/branding'

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

function whatsappHref(value: string) {
  const digits = value.replace(/\D/g, '')
  return digits ? `https://wa.me/${digits}` : null
}

function productInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

function storefrontEyebrow(mode: 'commerce' | 'services' | 'portfolio' | 'profile') {
  if (mode === 'commerce') return 'Tienda online'
  if (mode === 'services') return 'Estudio profesional'
  if (mode === 'portfolio') return 'Portfolio creativo'
  return 'Sitio público'
}

function storefrontFallbackDescription(mode: 'commerce' | 'services' | 'portfolio' | 'profile') {
  if (mode === 'commerce') return 'Productos seleccionados, disponibilidad y contacto directo.'
  if (mode === 'services') return 'Información del estudio y canales de consulta profesional.'
  if (mode === 'portfolio') return 'Trabajos, mirada y contacto para nuevos proyectos.'
  return 'Información principal y canales de contacto.'
}

function offerSummaryTitle(mode: 'commerce' | 'services' | 'portfolio' | 'profile') {
  if (mode === 'commerce') return 'Qué encontrás acá'
  if (mode === 'services') return 'Servicios y consultas'
  if (mode === 'portfolio') return 'Enfoque del portfolio'
  return 'Información disponible'
}

function aboutTitle(mode: 'commerce' | 'services' | 'portfolio' | 'profile') {
  if (mode === 'commerce') return 'Sobre la tienda'
  if (mode === 'services') return 'El estudio'
  if (mode === 'portfolio') return 'La mirada'
  return 'Sobre nosotros'
}

function contactIntro(mode: 'commerce' | 'services' | 'portfolio' | 'profile') {
  if (mode === 'commerce') return 'Canales disponibles para consultar antes de comprar.'
  if (mode === 'services') return 'Canales directos para coordinar una consulta profesional.'
  if (mode === 'portfolio') return 'Canales directos para conversar sobre una sesión o proyecto.'
  return 'Canales directos del negocio.'
}

function noCatalogFallbackCopy(mode: 'commerce' | 'services' | 'portfolio' | 'profile') {
  if (mode === 'services') {
    return {
      title: 'Consultas profesionales',
      description: 'El primer paso es una conversación. Elegí el canal que te resulte más cómodo.'
    }
  }
  if (mode === 'portfolio') {
    return {
      title: 'Proyectos y sesiones',
      description: 'El portfolio se presenta desde su historia y sus canales de contacto.'
    }
  }
  return {
    title: 'Pronto habrá novedades aquí',
    description: 'La tienda está preparando lo próximo. Mientras tanto, podés usar sus canales de contacto.'
  }
}

function StorefrontImage({ src, alt, style }: { src: string; alt: string; style?: CSSProperties }) {
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setFailed(false)
  }, [src])

  if (failed) return null

  return <img src={src} alt={alt} onError={() => setFailed(true)} style={style} />
}

function descriptionHighlights(description: string | null | undefined) {
  if (!description) return []

  return description
    .split(/[.,;]/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 12)
    .slice(0, 4)
}

const publicStoreStyles = {
  pageStack: { display: 'grid', gap: theme.spacing.lg, paddingBottom: theme.spacing.xxl },
  heroMobile: { padding: `${theme.spacing.lg} ${theme.spacing.md}` },
  heroDesktop: { padding: `${theme.spacing.xl} ${theme.spacing.xxl}` },
  surfaceMobile: { padding: `${theme.spacing.md} 0` },
  surfaceDesktop: { padding: `${theme.spacing.lg} 0` },
  storefrontHero: {
    position: 'relative',
    overflow: 'hidden',
    minHeight: 260,
    borderRadius: theme.radius.md,
    background: theme.colors.bgSurfaceAlt
  },
  storefrontHeroCompact: {
    minHeight: 0,
    background: 'transparent'
  },
  heroBannerImage: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block'
  },
  heroOverlay: {
    position: 'absolute',
    inset: 0,
    background: `linear-gradient(90deg, ${alpha(theme.colors.textPrimary, 0.82)}, ${alpha(theme.colors.textPrimary, 0.42)} 58%, ${alpha(theme.colors.textPrimary, 0.22)})`,
    pointerEvents: 'none'
  },
  heroContent: {
    position: 'relative',
    zIndex: 1,
    display: 'grid',
    gap: theme.spacing.md,
    alignContent: 'center',
    minHeight: 260
  },
  heroContentCompact: { minHeight: 0 },
  heroMain: { display: 'grid', gap: theme.spacing.md, maxWidth: 820 },
  heroLogoFrame: {
    width: 96,
    height: 96,
    borderRadius: theme.radius.lg,
    border: `1px solid ${theme.colors.borderDefault}`,
    background: theme.colors.bgSurface,
    display: 'grid',
    placeItems: 'center',
    padding: theme.spacing.md,
    boxShadow: `0 18px 42px ${alpha(theme.colors.textPrimary, 0.18)}`
  },
  heroLogo: { maxWidth: 76, maxHeight: 76, objectFit: 'contain' },
  heroTitle: {
    margin: 0,
    fontSize: 'clamp(28px, 4vw, 42px)',
    lineHeight: 1.05,
    letterSpacing: 0,
    color: theme.colors.textPrimary,
    overflowWrap: 'anywhere'
  },
  heroTitleOnImage: { color: theme.colors.bgSurface },
  heroDescription: { margin: 0, color: theme.colors.textMuted, fontSize: 15, lineHeight: 1.45, maxWidth: 720 },
  heroDescriptionOnImage: { color: alpha(theme.colors.bgSurface, 0.88) },
  heroActionRow: { display: 'flex', gap: theme.spacing.sm, flexWrap: 'wrap' },
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
  sectionStack: { display: 'grid', gap: theme.spacing.md },
  openSection: { display: 'grid', gap: theme.spacing.md },
  openSectionNarrow: { display: 'grid', gap: theme.spacing.md, maxWidth: 860 },
  contentStack: { display: 'grid', gap: theme.spacing.lg },
  valueGrid: { display: 'grid', gap: theme.spacing.md, gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 210px), 1fr))' },
  valueTile: {
    display: 'grid',
    gap: 6,
    padding: `${theme.spacing.md} 0`,
    borderTop: `1px solid ${theme.colors.borderDefault}`
  },
  valueTileLabel: { color: theme.colors.textMuted, fontSize: theme.typography.small.size, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0 },
  highlightList: { display: 'grid', gap: theme.spacing.sm, margin: 0, padding: 0, listStyle: 'none' },
  highlightItem: {
    paddingLeft: theme.spacing.md,
    borderLeft: `3px solid var(--store-secondary, ${theme.colors.actionPrimary})`,
    color: theme.colors.textMuted,
    lineHeight: 1.5
  },
  compactStack: { display: 'grid', gap: 6 },
  microStack: { display: 'grid', gap: 4 },
  contactGrid: { display: 'grid', gap: theme.spacing.md, gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', marginTop: theme.spacing.sm },
  contactItem: {
    display: 'grid',
    gap: 6,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 2,
    borderTopStyle: 'solid',
    borderTopColor: `var(--store-secondary, ${theme.colors.actionPrimary})`
  },
  contactLink: { color: `var(--store-primary, ${theme.colors.actionPrimary})`, fontWeight: 700, textDecoration: 'none', overflowWrap: 'anywhere' },
  promoGrid: { display: 'grid', gap: theme.spacing.sm, gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))' },
  promoCard: {
    display: 'grid',
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
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
    gap: theme.spacing.md,
    padding: `${theme.spacing.md} 0`,
    borderTopWidth: 1,
    borderTopStyle: 'solid',
    borderTopColor: theme.colors.borderDefault,
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: theme.colors.borderDefault,
    background: 'transparent'
  },
  filterHeader: { display: 'flex', justifyContent: 'space-between', gap: theme.spacing.md, alignItems: 'center', flexWrap: 'wrap' },
  filterControls: { display: 'grid', gap: theme.spacing.md, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', alignItems: 'end' },
  fieldLabel: { fontWeight: 600, marginBottom: theme.spacing.xs },
  categoryStack: { display: 'grid', gap: theme.spacing.sm },
  checkboxLabel: { display: 'flex', alignItems: 'center', gap: theme.spacing.sm, color: theme.colors.textMuted },
  productGrid: { display: 'grid', gap: theme.spacing.md, gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))' },
  productCard: { padding: 0, overflow: 'hidden', borderRadius: theme.radius.md },
  productCardActive: { padding: 0, overflow: 'hidden', borderColor: `var(--store-primary, ${theme.colors.actionPrimary})`, borderRadius: theme.radius.md },
  productMediaWrap: {
    padding: theme.spacing.sm,
    borderBottom: `1px solid ${theme.colors.borderDefault}`,
    background: theme.colors.bgSurfaceAlt
  },
  productMedia: {
    minHeight: 112,
    borderRadius: theme.radius.md,
    border: `1px solid var(--store-secondary, ${theme.colors.actionPrimary})`,
    background: theme.colors.bgSurface,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: `var(--store-primary, ${theme.colors.actionPrimary})`,
    fontWeight: 700,
    letterSpacing: 0,
    textTransform: 'uppercase',
    fontSize: 28
  },
  productBody: { display: 'grid', gap: theme.spacing.md, padding: theme.spacing.lg },
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
    gap: theme.spacing.md,
    flexWrap: 'wrap',
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
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
      store.profile.whatsapp ? { label: 'WhatsApp', value: store.profile.whatsapp, href: whatsappHref(store.profile.whatsapp), actionLabel: 'Escribir por WhatsApp' } : null,
      store.profile.phone ? { label: 'Teléfono', value: store.profile.phone, href: `tel:${store.profile.phone}`, actionLabel: 'Llamar' } : null,
      store.profile.email ? { label: 'Email', value: store.profile.email, href: `mailto:${store.profile.email}`, actionLabel: 'Enviar email' } : null
    ].filter((item): item is { label: string; value: string; href: string | null; actionLabel: string } => item !== null)
    : []
  const showContact = !error && store && contactEnabled && contactItems.length > 0
  const appearancePreset = store?.appearance ?? 'MODERN'
  const appearance = appearanceAttribute(appearancePreset)
  const isClassicAppearance = appearancePreset === 'CLASSIC'
  const isLocalBusinessAppearance = appearancePreset === 'LOCAL_BUSINESS'
  const isPortfolioAppearance = appearancePreset === 'PORTFOLIO'
  const storefrontMode = productsEnabled
    ? 'commerce'
    : isPortfolioAppearance
      ? 'portfolio'
      : isClassicAppearance
        ? 'services'
        : 'profile'
  const contactHref = contactItems.find((item) => item.href)?.href
  const contactActionLabel = contactItems.find((item) => item.href)?.label === 'WhatsApp'
    ? 'Escribir por WhatsApp'
    : 'Contactar'
  const branding = normalizeStoreBranding(store?.branding)
  const brandedVariables = storeBrandingCssVariables(store?.branding)
  const heroStyle = {
    ...(isMobile ? publicStoreStyles.heroMobile : publicStoreStyles.heroDesktop),
    ...brandedVariables,
    ...(!branding.bannerUrl && !productsEnabled ? { padding: isMobile ? `${theme.spacing.lg} 0` : `${theme.spacing.xl} 0` } : null),
    ...(isPortfolioAppearance ? { paddingBottom: isMobile ? theme.spacing.md : theme.spacing.lg } : null)
  }
  const surfaceStyle = {
    ...(isMobile ? publicStoreStyles.surfaceMobile : publicStoreStyles.surfaceDesktop),
    ...(isClassicAppearance ? { padding: isMobile ? `${theme.spacing.lg} 0` : `${theme.spacing.xl} 0` } : null)
  }
  const filterPanelStyle = {
    ...publicStoreStyles.filterPanel,
    borderTopColor: branding.secondaryColor,
    borderBottomColor: branding.secondaryColor,
    ...(isClassicAppearance ? { padding: `${theme.spacing.md} 0`, borderTopColor: theme.colors.borderStrong, borderBottomColor: theme.colors.borderStrong } : null),
    ...(isPortfolioAppearance ? { borderTopColor: theme.colors.borderDefault, borderBottomColor: theme.colors.borderDefault } : null)
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
  const noCatalogFallback = noCatalogFallbackCopy(storefrontMode)
  const profileHighlights = descriptionHighlights(aboutEnabled ? store?.profile.description : null)
  const hasCatalogFilters = Boolean(deferredSearchQuery.trim() || availableOnly || sort !== 'default' || categoryId)
  const trustSignals = store
    ? [
      productsEnabled ? {
        label: 'Catálogo',
        value: productsPage && !hasCatalogFilters
          ? `${productsPage.totalElements} producto${productsPage.totalElements === 1 ? '' : 's'} publicado${productsPage.totalElements === 1 ? '' : 's'}`
          : 'Productos con precio y disponibilidad'
      } : null,
      productsEnabled && store.categories.length > 0 ? {
        label: 'Categorías',
        value: `${store.categories.length} categoría${store.categories.length === 1 ? '' : 's'} para explorar`
      } : null,
      productsEnabled && checkoutEnabled ? {
        label: 'Compra',
        value: 'Pedido online con validación de stock al finalizar'
      } : null,
      productsEnabled && hasPublicStoreCapability(store.capabilities, 'SHIPPING') ? {
        label: 'Entrega',
        value: 'Opciones de envío disponibles en checkout'
      } : null,
      showPromotions ? {
        label: 'Promociones',
        value: `${store.promotions.length} código${store.promotions.length === 1 ? '' : 's'} activo${store.promotions.length === 1 ? '' : 's'}`
      } : null,
      !productsEnabled && profileHighlights.length > 0 ? {
        label: storefrontMode === 'portfolio' ? 'Perfil' : 'Especialidad',
        value: profileHighlights[0]
      } : null,
      showContact ? {
        label: 'Contacto',
        value: `${contactItems.length} canal${contactItems.length === 1 ? '' : 'es'} disponible${contactItems.length === 1 ? '' : 's'}`
      } : null
    ].filter((item): item is { label: string; value: string } => item !== null)
    : []
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
    <section id="sobre-nosotros" style={{ ...publicStoreStyles.openSectionNarrow, ...surfaceStyle }}>
        <div style={publicStoreStyles.compactStack}>
          <div style={publicStoreStyles.titleText}>{aboutTitle(storefrontMode)}</div>
          <div style={publicStoreStyles.mutedCopy}>
            {store.profile.description}
          </div>
        </div>
        {profileHighlights.length > 1 ? (
          <ul style={publicStoreStyles.highlightList}>
            {profileHighlights.slice(1).map((highlight) => (
              <li key={highlight} style={publicStoreStyles.highlightItem}>{highlight}</li>
            ))}
          </ul>
        ) : null}
    </section>
  ) : null

  const contactSection = showContact ? (
    <section id="contacto" style={{ ...publicStoreStyles.openSection, ...surfaceStyle }}>
        <div style={publicStoreStyles.compactStack}>
          <div style={publicStoreStyles.splitRow}>
            <div style={publicStoreStyles.compactStack}>
              <div style={publicStoreStyles.titleText}>Contacto</div>
              <div style={publicStoreStyles.compactMutedCopy}>{contactIntro(storefrontMode)}</div>
            </div>
            {isLocalBusinessAppearance && contactHref ? (
              <a href={contactHref} style={{ textDecoration: 'none' }} target={contactHref.startsWith('http') ? '_blank' : undefined} rel={contactHref.startsWith('http') ? 'noreferrer' : undefined}>
                <Button variant="primary">{contactActionLabel}</Button>
              </a>
            ) : null}
          </div>
          <div style={publicStoreStyles.contactGrid}>
            {contactItems.map((item) => (
              <div
                key={item.label}
                style={{
                  ...publicStoreStyles.contactItem,
                  ...(isClassicAppearance ? { borderTopColor: theme.colors.borderStrong } : null)
                }}
              >
                <div style={publicStoreStyles.fieldLabel}>{item.label}</div>
                {item.href ? (
                  <a href={item.href} style={publicStoreStyles.contactLink} target={item.href.startsWith('http') ? '_blank' : undefined} rel={item.href.startsWith('http') ? 'noreferrer' : undefined}>
                    {item.actionLabel}
                  </a>
                ) : (
                  <div style={publicStoreStyles.anywhereMuted}>{item.value}</div>
                )}
                <div style={publicStoreStyles.anywhereMuted}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>
    </section>
  ) : null
  const profileSections = (
    <>
      {isLocalBusinessAppearance ? contactSection : aboutSection}
      {isLocalBusinessAppearance ? aboutSection : contactSection}
    </>
  )
  const nonCommerceLeadSection = !productsEnabled && (storefrontMode === 'services' || storefrontMode === 'portfolio') ? (
    <section style={{ ...publicStoreStyles.openSectionNarrow, ...surfaceStyle }}>
        <div style={publicStoreStyles.compactStack}>
          <div style={publicStoreStyles.titleText}>{noCatalogFallback.title}</div>
          <div style={publicStoreStyles.mutedCopy}>{noCatalogFallback.description}</div>
        </div>
        {profileHighlights.length > 0 ? (
          <div style={publicStoreStyles.valueGrid}>
            {profileHighlights.map((highlight) => (
              <div key={highlight} style={publicStoreStyles.valueTile}>
                <div style={publicStoreStyles.valueTileLabel}>{offerSummaryTitle(storefrontMode)}</div>
                <div style={publicStoreStyles.cartItemName}>{highlight}</div>
              </div>
            ))}
          </div>
        ) : null}
    </section>
  ) : null

  const trustSection = !error && store && trustSignals.length > 0 ? (
    <section aria-label="Señales de confianza" style={{ ...publicStoreStyles.openSection, ...surfaceStyle }}>
      <div style={publicStoreStyles.splitTopRow}>
        <div style={publicStoreStyles.compactStack}>
          <div style={publicStoreStyles.eyebrow}>Información útil</div>
          <div style={publicStoreStyles.titleText}>{offerSummaryTitle(storefrontMode)}</div>
        </div>
        {contactHref ? (
          <a href={contactHref} style={{ textDecoration: 'none' }} target={contactHref.startsWith('http') ? '_blank' : undefined} rel={contactHref.startsWith('http') ? 'noreferrer' : undefined}>
            <Button variant="secondary">{contactActionLabel}</Button>
          </a>
        ) : null}
      </div>
      <div style={publicStoreStyles.valueGrid}>
        {trustSignals.map((signal) => (
          <div key={signal.label} style={publicStoreStyles.valueTile}>
            <div style={publicStoreStyles.valueTileLabel}>{signal.label}</div>
            <div style={publicStoreStyles.cartItemName}>{signal.value}</div>
          </div>
        ))}
      </div>
    </section>
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
      branding={store?.branding}
      capabilities={store?.capabilities}
    >
      <div id="inicio" data-appearance={appearance} style={{ ...publicStoreStyles.pageStack, ...brandedVariables, gap: isClassicAppearance ? theme.spacing.lg : publicStoreStyles.pageStack.gap }}>
        <section
          style={{
            ...publicStoreStyles.storefrontHero,
            ...(branding.bannerUrl ? null : publicStoreStyles.storefrontHeroCompact),
            ...heroStyle
          }}
        >
          {branding.bannerUrl ? (
            <>
              <StorefrontImage
                src={branding.bannerUrl}
                alt={`Portada de ${store?.name ?? 'la tienda'}`}
                style={publicStoreStyles.heroBannerImage}
              />
              <div aria-hidden="true" style={publicStoreStyles.heroOverlay} />
            </>
          ) : null}

          <div
            style={{
              ...publicStoreStyles.heroContent,
              ...(branding.bannerUrl ? null : publicStoreStyles.heroContentCompact)
            }}
          >
            <div style={publicStoreStyles.heroMain}>
              {branding.logoUrl ? (
                <div style={publicStoreStyles.heroLogoFrame}>
                  <StorefrontImage
                    src={branding.logoUrl}
                    alt={`Logo de ${store?.name ?? 'la tienda'}`}
                    style={publicStoreStyles.heroLogo}
                  />
                </div>
              ) : null}
              <div style={publicStoreStyles.compactStack}>
                <div
                  style={{
                    ...publicStoreStyles.eyebrow,
                    color: branding.bannerUrl ? alpha(theme.colors.bgSurface, 0.78) : `var(--store-primary, ${theme.colors.actionPrimary})`
                  }}
                >
                  {storefrontEyebrow(storefrontMode)}
                </div>
                <h1
                  style={{
                    ...publicStoreStyles.heroTitle,
                    ...(branding.bannerUrl ? publicStoreStyles.heroTitleOnImage : null)
                  }}
                >
                  {store?.name ?? 'Tienda'}
                </h1>
                <p
                  style={{
                    ...publicStoreStyles.heroDescription,
                    ...(branding.bannerUrl ? publicStoreStyles.heroDescriptionOnImage : null)
                  }}
                >
                  {(aboutEnabled ? store?.profile.description : null) ?? storefrontFallbackDescription(storefrontMode)}
                </p>
              </div>
              <div style={publicStoreStyles.badgeRow}>
                {primaryCategory && productsEnabled ? <Badge variant="neutral">{primaryCategory}</Badge> : null}
                {productsEnabled && checkoutEnabled ? <Badge variant="success">Compra online</Badge> : null}
                {checkoutEnabled && cartItemsCount > 0 ? <Badge variant="neutral">Carrito: {cartItemsCount} item{cartItemsCount === 1 ? '' : 's'}</Badge> : null}
              </div>
              <div style={publicStoreStyles.heroActionRow}>
                {checkoutEnabled && cartItemsCount > 0 ? (
                  <Button variant="primary" onClick={() => navigate(routes.storeCheckout)}>
                    Ver carrito{cartItemsCount > 0 ? ` (${cartItemsCount})` : ''}
                  </Button>
                ) : null}
                {contactHref ? (
                  <a href={contactHref} style={{ textDecoration: 'none' }} target={contactHref.startsWith('http') ? '_blank' : undefined} rel={contactHref.startsWith('http') ? 'noreferrer' : undefined}>
                    <Button variant={checkoutEnabled ? 'secondary' : 'primary'}>{contactActionLabel}</Button>
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        {checkoutEnabled && cart.storeSlug && cart.storeSlug !== slug ? (
          <section style={{ ...publicStoreStyles.openSection, ...surfaceStyle }}>
            <Badge variant="warning">Tu carrito pertenece a otra tienda</Badge>
          </section>
        ) : null}

        {isInitialLoading ? (
          <section style={{ ...publicStoreStyles.openSection, ...surfaceStyle }}>
            <LoadingBlock label="Cargando tienda..." />
          </section>
        ) : null}

        {error ? (
          <section style={{ ...publicStoreStyles.openSection, ...surfaceStyle }}>
            <ErrorAlert
              message={error}
              actionLabel="Reintentar"
              onAction={refetch}
              actionDisabled={isRetrying}
            />
          </section>
        ) : null}

        {trustSection}

        {!productsEnabled ? nonCommerceLeadSection : null}
        {!productsEnabled ? profileSections : null}

        {!error && store && !productsEnabled && !showAbout && !showContact ? (
          <section style={{ ...publicStoreStyles.openSection, ...surfaceStyle }}>
            <EmptyState
              title={noCatalogFallback.title}
              description={noCatalogFallback.description}
              actionLabel="Ver otras tiendas"
              onAction={() => navigate(routes.ecosystemStoresMap)}
            />
          </section>
        ) : null}

        {showCatalog ? (
          <section id="productos" style={{ ...publicStoreStyles.contentStack, ...surfaceStyle }}>
              <div
                style={publicStoreStyles.splitRow}
              >
                <div style={publicStoreStyles.compactStack}>
                  <div style={publicStoreStyles.titleText}>
                    Productos
                  </div>
                  <div style={publicStoreStyles.compactMutedCopy}>
                    Elegí productos de la tienda y armá tu pedido.
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
                    <div style={publicStoreStyles.cartItemName}>Encontrá lo que buscás</div>
                    <div style={publicStoreStyles.cartMeta}>
                      {products.length} resultado{products.length === 1 ? '' : 's'} visible{products.length === 1 ? '' : 's'}.
                    </div>
                  </div>
                  {availableOnly ? <Badge variant="neutral">Solo disponibles</Badge> : null}
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
                      placeholder="Ej. taza, manta, vela"
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

              </div>

              {isOutOfRangePage ? (
                <EmptyState
                  title="Volvé al inicio de estos resultados"
                  description="Los filtros siguen activos, pero esta página ya no tiene productos para mostrar."
                  actionLabel="Volver a la primera página"
                  onAction={() => setPage(0)}
                />
              ) : products.length === 0 ? (
                <EmptyState
                  title={searchQuery.trim() || availableOnly || sort !== 'default' || categoryId
                    ? 'No encontramos resultados'
                    : 'Pronto habrá novedades aquí'}
                  description={searchQuery.trim() || availableOnly || sort !== 'default' || categoryId
                    ? 'Probá otra búsqueda o quitá filtros para ver más opciones.'
                    : 'La tienda está preparando su catálogo. Volvé a consultar más adelante o usá sus canales de contacto.'}
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
                          {productInitials(product.name) || '•'}
                        </div>
                      </div>

                      <div style={productBodyStyle}>
                        <div style={publicStoreStyles.badgeRow}>
                          {product.categoryName ? <Badge variant="info" style={{ color: branding.secondaryColor }}>{product.categoryName}</Badge> : null}
                          <Badge variant={product.isAvailable ? 'success' : 'error'}>
                            {product.isAvailable ? 'Disponible' : 'Sin stock'}
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
                          <div style={publicStoreStyles.mutedCopy}>
                            {product.isAvailable
                              ? 'Listo para sumar al pedido.'
                              : 'Por ahora no se puede agregar al carrito.'}
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
          </section>
        ) : null}

        {showPromotions ? (
          <section style={{ ...publicStoreStyles.openSection, ...surfaceStyle }}>
              <div style={publicStoreStyles.splitRow}>
                <div style={publicStoreStyles.compactStack}>
                  <div style={publicStoreStyles.titleText}>
                    Promociones activas
                  </div>
                  <div style={publicStoreStyles.compactMutedCopy}>
                    Usá el código al finalizar la compra.
                  </div>
                </div>
                <Button variant="secondary" onClick={() => navigate(routes.storeCheckout)}>
                  Ir al checkout
                </Button>
              </div>
              <div style={publicStoreStyles.promoGrid}>
                {store.promotions.map((promotion) => (
                  <div
                    key={promotion.code}
                    style={publicStoreStyles.promoCard}
                  >
                    <div style={publicStoreStyles.splitTopRow}>
                      <Badge variant="info" style={{ color: branding.secondaryColor }}>{promotion.code}</Badge>
                      {formatPromotionExpiry(promotion) ? <Badge variant="neutral">Vence {formatPromotionExpiry(promotion)}</Badge> : null}
                    </div>
                    <div style={publicStoreStyles.cartItemName}>{promotion.shortLabel}</div>
                  </div>
                ))}
              </div>
          </section>
        ) : null}

        {checkoutEnabled && cart.items.length > 0 ? (
        <section
          style={{
            ...publicStoreStyles.openSection,
            ...surfaceStyle,
            ...publicStoreStyles.warmSurface,
            background: 'transparent'
          }}
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

          <div style={{ display: 'grid', gap: theme.spacing.md, marginTop: theme.spacing.md }}>
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
        </section>
        ) : null}

        {productsEnabled ? profileSections : null}
      </div>
    </PublicStoreLayout>
  )
}
