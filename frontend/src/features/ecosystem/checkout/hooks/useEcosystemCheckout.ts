import { useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { appConfig } from '@/app/config/env'
import { extractBackendErrorMessage } from '@/core/errors'
import { useEcosystemCart } from '../../cart/ecosystemCartContext'
import type { EcosystemCheckoutPreviewRes, EcosystemShippingQuoteRes } from '../../../../api/contracts/v1/ecosystem'
import { ecosystemAdapter, publicEcosystemAdapter } from '../api'
import { trackBetaEvent } from '@/features/beta'
import type {
  EcosystemCheckoutCartItemViewModel,
  EcosystemCheckoutPreview,
  EcosystemCheckoutSuccessState
} from '../types'

function mapCheckoutError(error: unknown) {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = String((error as { code?: unknown }).code)
    if (code === 'missing_postal_code') return 'Ingresá un código postal para cotizar envío.'
    if (code === 'shipping_not_available') return 'No hay envío disponible para ese código postal.'
    if (code === 'shipping_not_supported') return 'El carrito tiene productos sin soporte de entrega.'
    if (code === 'ecosystem_not_found') return 'El ecosystem configurado no existe o no está activo.'
    if (code === 'external_product_not_found') return 'Uno o más productos externos ya no están disponibles.'
    if (code === 'external_product_wrong_ecosystem') return 'Hay productos que no pertenecen al ecosystem actual.'
    if (code === 'coupon_not_found') return 'El cupón no existe.'
    if (code === 'coupon_inactive') return 'El cupón está inactivo.'
    if (code === 'coupon_expired') return 'El cupón está vencido.'
    if (code === 'coupon_usage_limit_reached') return 'El cupón alcanzó su límite de uso.'
  }
  return extractBackendErrorMessage(error, 'Ocurrió un error inesperado.')
}

export function useEcosystemCheckout() {
  const cart = useEcosystemCart()
  const slug = appConfig.publicEcosystemSlug
  const [postalCode, setPostalCode] = useState('1900')
  const [postalCodeError, setPostalCodeError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [quote, setQuote] = useState<EcosystemShippingQuoteRes | null>(null)
  const [couponCode, setCouponCode] = useState('')
  const [couponFeedback, setCouponFeedback] = useState<{ status: 'idle' | 'valid' | 'invalid'; message: string | null }>(() => ({
    status: 'idle',
    message: null
  }))

  const ecosystemQuery = useQuery({
    queryKey: ['public-ecosystem', slug],
    queryFn: () => publicEcosystemAdapter.getEcosystem(slug)
  })

  const cartItems = useMemo<EcosystemCheckoutCartItemViewModel[]>(() => cart.items, [cart.items])
  const subtotalAmount = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.unitPriceAmount * item.qty, 0),
    [cartItems]
  )
  const canQuoteShipping = useMemo(
    () => cartItems.length > 0 && cartItems.every((item) => item.deliverySupported !== false),
    [cartItems]
  )
  const requiresShippingQuote = canQuoteShipping && cartItems.length > 0

  const quoteMutation = useMutation({
    mutationFn: (nextPostalCode: string) => {
      const ecosystemId = ecosystemQuery.data?.id
      if (!ecosystemId) throw new Error('No se pudo resolver el ecosystem actual.')
      return ecosystemAdapter.getShippingQuote(ecosystemId, nextPostalCode)
    },
    onSuccess: (data) => {
      setQuote(data)
      setError(null)
      setPostalCodeError(null)
    },
    onError: (mutationError) => {
      setQuote(null)
      setError(mapCheckoutError(mutationError))
      trackBetaEvent({
        eventName: 'checkout_failure',
        ecosystemSlug: slug,
        metadata: {
          surface: 'ecosystem_checkout',
          reason: mapCheckoutError(mutationError)
        }
      })
    }
  })

  const previewMutation = useMutation({
    mutationFn: async () => {
      const ecosystem = ecosystemQuery.data
      if (!ecosystem) throw new Error('No se pudo resolver el ecosystem actual.')
      return ecosystemAdapter.previewCheckout({
        ecosystemId: ecosystem.id,
        items: cartItems.map((item) => ({ externalProductId: item.externalProductId, qty: item.qty })),
        shipping: quote?.available ? { postalCode: postalCode.trim() } : undefined,
        couponCode: couponCode.trim()
      })
    },
    onSuccess: (data) => {
      if (couponCode.trim() && data.appliedCouponCode) {
        setCouponFeedback({
          status: 'valid',
          message: `Cupón ${data.appliedCouponCode} aplicado`
        })
      } else if (couponCode.trim()) {
        setCouponFeedback({
          status: 'idle',
          message: null
        })
      }
      setError(null)
    },
    onError: (mutationError) => {
      setCouponFeedback({
        status: 'invalid',
        message: mapCheckoutError(mutationError)
      })
    }
  })

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      const ecosystem = ecosystemQuery.data
      if (!ecosystem) throw new Error('No se pudo resolver el ecosystem actual.')
      return ecosystemAdapter.checkout({
        ecosystemId: ecosystem.id,
        items: cartItems.map((item) => ({ externalProductId: item.externalProductId, qty: item.qty })),
        shipping: quote?.available ? { postalCode: postalCode.trim() } : undefined,
        couponCode: couponFeedback.status === 'valid' ? couponCode.trim() : undefined
      })
    },
    onError: (mutationError) => {
      setError(mapCheckoutError(mutationError))
    }
  })

  const preview = useMemo<EcosystemCheckoutPreview>(() => {
    const shippingCostAmount = quote?.available ? quote.costAmount ?? 0 : 0
    const baseCurrency = quote?.currency ?? cartItems[0]?.currency ?? 'ARS'
    const computedBase: EcosystemCheckoutPreviewRes = {
      subtotalAmount,
      originalAmount: subtotalAmount + shippingCostAmount,
      discountAmount: 0,
      appliedCouponCode: null,
      shippingCostAmount,
      shippingCurrency: quote?.available ? quote?.currency ?? baseCurrency : '',
      shippingZoneId: quote?.available ? quote.zoneId : null,
      shippingPostalCode: quote?.available ? postalCode.trim() || null : null,
      totalAmount: subtotalAmount + shippingCostAmount,
      currency: baseCurrency
    }
    const amounts = previewMutation.data ?? computedBase
    return {
      items: cartItems,
      postalCode,
      ...amounts,
      canQuoteShipping
    }
  }, [cartItems, canQuoteShipping, postalCode, previewMutation.data, quote, subtotalAmount])

  const validatePostalCode = () => {
    if (!postalCode.trim()) {
      setPostalCodeError('Ingresá un código postal.')
      return false
    }
    setPostalCodeError(null)
    return true
  }

  const requestQuote = async () => {
    if (!canQuoteShipping) {
      setError('El carrito actual no soporta envío.')
      return null
    }
    if (!validatePostalCode()) return null
    return quoteMutation.mutateAsync(postalCode.trim())
  }

  const applyCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponFeedback({ status: 'idle', message: null })
      previewMutation.reset()
      return null
    }
    try {
      return await previewMutation.mutateAsync()
    } catch {
      return null
    }
  }

  const submitOrder = async (): Promise<EcosystemCheckoutSuccessState | null> => {
    if (cartItems.length === 0) {
      setError('El carrito está vacío.')
      return null
    }
    if (requiresShippingQuote && !quote?.available) {
      setError(quote ? 'No hay envío disponible para ese código postal. Revisá el destino o el carrito antes de continuar.' : 'Cotizá el envío antes de crear la orden para confirmar el total final.')
      return null
    }
    const ecosystem = ecosystemQuery.data
    if (!ecosystem) {
      setError('No se pudo resolver el ecosystem actual.')
      return null
    }
    const submittedItems = [...cartItems]
    let order
    try {
      order = await checkoutMutation.mutateAsync()
    } catch {
      return null
    }
    cart.clear()
    trackBetaEvent({
      eventName: 'checkout_success',
      ecosystemSlug: slug,
      metadata: {
        surface: 'ecosystem_checkout',
        status: order.status
      }
    })
    return {
      ecosystem,
      order,
      quote,
      submittedItems
    }
  }

  const increaseItem = (item: EcosystemCheckoutCartItemViewModel) => {
    cart.addItem({
      externalProductId: item.externalProductId,
      name: item.name,
      unitPriceAmount: item.unitPriceAmount,
      currency: item.currency,
      deliverySupported: item.deliverySupported
    })
  }

  const decreaseItem = (externalProductId: string) => {
    cart.removeItem(externalProductId)
  }

  const clearFeedback = () => setError(null)

  return {
    slug,
    ecosystem: ecosystemQuery.data ?? null,
    cartItems,
    quote,
    couponCode,
    couponFeedback,
    error: ecosystemQuery.error ? mapCheckoutError(ecosystemQuery.error) : error,
    postalCode,
    postalCodeError,
    preview,
    requiresShippingQuote,
    isLoading: ecosystemQuery.isLoading && cartItems.length > 0,
    isQuoteLoading: quoteMutation.isPending,
    isCouponLoading: previewMutation.isPending,
    isCheckoutLoading: checkoutMutation.isPending,
    setPostalCode: (value: string) => {
      setPostalCode(value)
      setQuote(null)
      setPostalCodeError(null)
      clearFeedback()
    },
    setCouponCode: (value: string) => {
      setCouponCode(value)
      setCouponFeedback({ status: 'idle', message: null })
      previewMutation.reset()
      clearFeedback()
    },
    requestQuote,
    applyCoupon,
    submitOrder,
    increaseItem,
    decreaseItem,
    clearCart: cart.clear,
    clearFeedback
  }
}
