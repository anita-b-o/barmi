import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import type { StoreCheckoutPreviewRes, StoreShippingQuoteRes } from '../../../../api/contracts/v1/store'
import { publicAdapter } from '../../../../api/adapters/publicAdapter'
import { useCart } from '@/features/store/cart/cartContext'
import { getBrowserTenantContext } from '@/core/tenant'
import { extractBackendErrorMessage } from '@/core/errors'
import { storeAdapter } from '../api'
import type { StoreCartItemViewModel, StoreCheckoutPreview, StoreCheckoutSuccessState, StoreCouponPreviewState } from '../types'
import { trackBetaEvent } from '@/features/beta'

function buildStoreContextMessage() {
  const tenant = getBrowserTenantContext()
  if (tenant.slug) {
    return `El store context no fue resuelto correctamente para ${tenant.host}.`
  }
  return `Store context required. Abrí el frontend con un host de tienda, por ejemplo demo-store.example.com.`
}

function mapErrorMessage(error: unknown) {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = String((error as { code?: unknown }).code)
    if (code === 'store_context_required') return buildStoreContextMessage()
    if (code === 'shipping_not_available') return 'Envío no disponible para ese código postal.'
    if (code === 'product_out_of_stock') return 'Una o más cantidades superan el stock disponible.'
    if (code === 'coupon_not_found') return 'El código de descuento no existe.'
    if (code === 'coupon_inactive') return 'El código de descuento está inactivo.'
    if (code === 'coupon_expired') return 'El código de descuento venció.'
    if (code === 'coupon_usage_limit_reached') return 'El código de descuento ya alcanzó su límite de uso.'
  }
  return extractBackendErrorMessage(error, 'Ocurrió un error inesperado.')
}

export function useStoreCheckout() {
  const cart = useCart()
  const [buyerEmail, setBuyerEmail] = useState('')
  const [buyerEmailError, setBuyerEmailError] = useState<string | null>(null)
  const [postalCode, setPostalCode] = useState('1900')
  const [couponCode, setCouponCode] = useState('')
  const [postalCodeError, setPostalCodeError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [quote, setQuote] = useState<StoreShippingQuoteRes | null>(null)
  const [successState, setSuccessState] = useState<StoreCheckoutSuccessState | null>(null)
  const [couponPreview, setCouponPreview] = useState<StoreCouponPreviewState>({
    status: 'idle',
    message: null,
    totals: null
  })

  const subtotalCents = useMemo(() => cart.items.reduce((sum, item) => sum + item.priceCents * item.qty, 0), [cart.items])
  const subtotalAmount = subtotalCents / 100

  const availabilityQuery = useQuery({
    queryKey: ['checkout-store-products', cart.storeSlug],
    queryFn: () => publicAdapter.getProducts(cart.storeSlug ?? ''),
    enabled: Boolean(cart.storeSlug),
    staleTime: 30_000
  })

  const quoteMutation = useMutation({
    mutationFn: (nextPostalCode: string) => storeAdapter.getShippingQuote(nextPostalCode),
    onSuccess: (data) => {
      setQuote(data)
      setPostalCodeError(null)
      setError(null)
      setCouponPreview((current) => current.status === 'valid'
        ? { status: 'idle', message: null, totals: null }
        : current)
    },
    onError: (mutationError) => {
      setError(mapErrorMessage(mutationError))
    }
  })

  const previewMutation = useMutation({
    mutationFn: async () => {
      return storeAdapter.previewCheckout({
        items: cart.items.map((item) => ({ productId: item.productId, qty: item.qty })),
        shipping: { postalCode: postalCode.trim() },
        couponCode: couponCode.trim()
      })
    },
    onSuccess: (totals) => {
      const normalizedCode = couponCode.trim().toUpperCase()
      setCouponPreview({
        status: 'valid',
        message: `Código ${normalizedCode} aplicado.`,
        totals
      })
      setError(null)
    },
    onError: (mutationError) => {
      setCouponPreview({
        status: 'invalid',
        message: mapErrorMessage(mutationError),
        totals: null
      })
    }
  })

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      const response = await storeAdapter.checkout({
        items: cart.items.map((item) => ({ productId: item.productId, qty: item.qty })),
        shipping: { postalCode: postalCode.trim() },
        couponCode: couponPreview.status === 'valid' ? couponCode.trim() : undefined,
        buyerEmail: buyerEmail.trim()
      })
      return response
    },
    onSuccess: (order) => {
      const currentStoreSlug = cart.storeSlug
      const state: StoreCheckoutSuccessState = {
        order,
        quote,
        submittedItems: cart.items
      }
      setSuccessState(state)
      setError(null)
      trackBetaEvent({
        eventName: 'checkout_success',
        storeSlug: currentStoreSlug ?? undefined,
        metadata: {
          surface: 'store_checkout',
          status: order.status
        }
      })
      cart.clear()
    },
    onError: (mutationError) => {
      setError(mapErrorMessage(mutationError))
      trackBetaEvent({
        eventName: 'checkout_failure',
        storeSlug: cart.storeSlug ?? undefined,
        metadata: {
          surface: 'store_checkout',
          reason: mapErrorMessage(mutationError)
        }
      })
    }
  })

  const productById = useMemo(() => {
    const map = new Map<string, { stockQuantity: number; isAvailable: boolean }>()
    for (const product of availabilityQuery.data ?? []) {
      map.set(product.id, {
        stockQuantity: product.stockQuantity,
        isAvailable: product.isAvailable
      })
    }
    return map
  }, [availabilityQuery.data])

  const cartItems = useMemo<StoreCartItemViewModel[]>(
    () => cart.items.map((item) => {
      const availability = productById.get(item.productId)
      return {
        ...item,
        stockQuantity: availability?.stockQuantity ?? null,
        isAvailable: availability?.isAvailable ?? null
      }
    }),
    [cart.items, productById]
  )

  useEffect(() => {
    setCouponPreview((current) => current.status === 'idle' && current.totals === null
      ? current
      : {
          status: 'idle',
          message: null,
          totals: null
        })
  }, [cart.items])

  const baseTotals = useMemo<StoreCheckoutPreviewRes>(() => {
    const shippingCostAmount = quote?.costAmount ?? 0
    const currency = quote?.currency ?? 'ARS'
    return {
      subtotalAmount,
      originalAmount: subtotalAmount + shippingCostAmount,
      discountAmount: 0,
      appliedCouponCode: null,
      shippingCostAmount,
      totalAmount: subtotalAmount + shippingCostAmount,
      currency,
      shippingCurrency: currency,
      shippingZoneId: quote?.zoneId ?? null,
      shippingPostalCode: quote?.postalCode ?? null
    }
  }, [quote, subtotalAmount])

  const preview = useMemo<StoreCheckoutPreview>(() => {
    const totals = couponPreview.status === 'valid' && couponPreview.totals ? couponPreview.totals : baseTotals
    return {
      items: cartItems,
      postalCode,
      subtotalAmount: totals.subtotalAmount,
      originalAmount: totals.originalAmount,
      discountAmount: totals.discountAmount,
      appliedCouponCode: totals.appliedCouponCode,
      shippingCostAmount: totals.shippingCostAmount,
      totalAmount: totals.totalAmount,
      currency: totals.currency
    }
  }, [baseTotals, cartItems, couponPreview.status, couponPreview.totals, postalCode])

  const validatePostalCode = () => {
    if (!postalCode.trim()) {
      setPostalCodeError('Ingresá un código postal.')
      return false
    }
    setPostalCodeError(null)
    return true
  }

  const validateBuyerEmail = () => {
    const normalized = buyerEmail.trim()
    if (!normalized) {
      setBuyerEmailError('Ingresá un email para recibir las notificaciones de la orden.')
      return false
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      setBuyerEmailError('Ingresá un email válido.')
      return false
    }
    setBuyerEmailError(null)
    return true
  }

  const requestQuote = async () => {
    if (!validatePostalCode()) return null
    return quoteMutation.mutateAsync(postalCode.trim())
  }

  const applyCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponPreview({
        status: 'invalid',
        message: 'Ingresá un código de descuento.',
        totals: null
      })
      return null
    }
    if (!validatePostalCode()) return null
    if (cart.items.length === 0) {
      setCouponPreview({
        status: 'invalid',
        message: 'El carrito está vacío.',
        totals: null
      })
      return null
    }
    try {
      return await previewMutation.mutateAsync()
    } catch {
      return null
    }
  }

  const submitOrder = async (): Promise<StoreCheckoutSuccessState | null> => {
    if (!validateBuyerEmail()) return null
    if (!validatePostalCode()) return null
    if (cart.items.length === 0) {
      setError('El carrito está vacío.')
      return null
    }
    const submittedItems = [...cart.items]
    let order
    try {
      order = await checkoutMutation.mutateAsync()
    } catch {
      return null
    }
    return {
      order,
      quote,
      submittedItems
    }
  }

  const increaseItem = (item: StoreCartItemViewModel) => {
    if (!cart.storeSlug) return
    cart.addItem(cart.storeSlug, {
      productId: item.productId,
      name: item.name,
      priceCents: item.priceCents
    })
  }

  const setItemQuantity = (productId: string, qty: number) => {
    cart.setItemQuantity(productId, qty)
  }

  const removeLineItem = (productId: string) => {
    cart.removeLineItem(productId)
  }

  const clearFeedback = () => {
    setError(null)
  }

  const resetCouponPreview = () => {
    setCouponPreview({
      status: 'idle',
      message: null,
      totals: null
    })
  }

  return {
    cartItems,
    cartStoreSlug: cart.storeSlug,
    subtotalCents,
    buyerEmail,
    postalCode,
    couponCode,
    couponPreview,
    buyerEmailError,
    postalCodeError,
    quote,
    preview,
    successState,
    error,
    availabilityError: availabilityQuery.error ? mapErrorMessage(availabilityQuery.error) : null,
    isAvailabilityLoading: availabilityQuery.isLoading,
    isQuoteLoading: quoteMutation.isPending,
    isCouponLoading: previewMutation.isPending,
    isCheckoutLoading: checkoutMutation.isPending,
    setBuyerEmail: (value: string) => {
      setBuyerEmail(value)
      setBuyerEmailError(null)
      clearFeedback()
    },
    setPostalCode: (value: string) => {
      setPostalCode(value)
      setQuote(null)
      setPostalCodeError(null)
      resetCouponPreview()
      clearFeedback()
    },
    setCouponCode: (value: string) => {
      setCouponCode(value)
      resetCouponPreview()
      clearFeedback()
    },
    requestQuote,
    applyCoupon,
    submitOrder,
    removeItem: cart.removeItem,
    removeLineItem,
    setItemQuantity,
    increaseItem,
    clearFeedback
  }
}
