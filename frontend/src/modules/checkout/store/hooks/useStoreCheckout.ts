import { useMemo, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import type { StoreShippingQuoteRes } from '../../../../api/contracts/v1/store'
import { useCart } from '../../../../ui/state/cartContext'
import { getBrowserTenantContext } from '../../../../core/tenant'
import { extractBackendErrorMessage } from '../../../../core/errors'
import { storeAdapter } from '../api'
import type { StoreCartItemViewModel, StoreCheckoutPreview, StoreCheckoutSuccessState } from '../types'

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
  }
  return extractBackendErrorMessage(error, 'Ocurrió un error inesperado.')
}

export function useStoreCheckout() {
  const cart = useCart()
  const [postalCode, setPostalCode] = useState('1900')
  const [postalCodeError, setPostalCodeError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [quote, setQuote] = useState<StoreShippingQuoteRes | null>(null)
  const [successState, setSuccessState] = useState<StoreCheckoutSuccessState | null>(null)

  const subtotalCents = useMemo(() => cart.items.reduce((sum, item) => sum + item.priceCents * item.qty, 0), [cart.items])
  const subtotalAmount = subtotalCents / 100

  const quoteMutation = useMutation({
    mutationFn: (nextPostalCode: string) => storeAdapter.getShippingQuote(nextPostalCode),
    onSuccess: (data) => {
      setQuote(data)
      setPostalCodeError(null)
      setError(null)
    },
    onError: (mutationError) => {
      setError(mapErrorMessage(mutationError))
    }
  })

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      const response = await storeAdapter.checkout({
        items: cart.items.map((item) => ({ productId: item.productId, qty: item.qty })),
        shipping: { postalCode: postalCode.trim() }
      })
      return response
    },
    onSuccess: (order) => {
      const state: StoreCheckoutSuccessState = {
        order,
        quote,
        submittedItems: cart.items
      }
      setSuccessState(state)
      setError(null)
      cart.clear()
    },
    onError: (mutationError) => {
      setError(mapErrorMessage(mutationError))
    }
  })

  const cartItems = useMemo<StoreCartItemViewModel[]>(() => cart.items, [cart.items])

  const preview = useMemo<StoreCheckoutPreview>(() => {
    const shippingCostAmount = quote?.costAmount ?? 0
    const currency = quote?.currency ?? 'ARS'
    return {
      items: cartItems,
      postalCode,
      subtotalAmount,
      shippingCostAmount,
      totalAmount: subtotalAmount + shippingCostAmount,
      currency
    }
  }, [cartItems, postalCode, quote, subtotalAmount])

  const validatePostalCode = () => {
    if (!postalCode.trim()) {
      setPostalCodeError('Ingresá un código postal.')
      return false
    }
    setPostalCodeError(null)
    return true
  }

  const requestQuote = async () => {
    if (!validatePostalCode()) return null
    return quoteMutation.mutateAsync(postalCode.trim())
  }

  const submitOrder = async (): Promise<StoreCheckoutSuccessState | null> => {
    if (!validatePostalCode()) return null
    if (cart.items.length === 0) {
      setError('El carrito está vacío.')
      return null
    }
    const submittedItems = [...cart.items]
    const order = await checkoutMutation.mutateAsync()
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

  const clearFeedback = () => {
    setError(null)
  }

  return {
    cartItems,
    cartStoreSlug: cart.storeSlug,
    subtotalCents,
    postalCode,
    postalCodeError,
    quote,
    preview,
    successState,
    error,
    isQuoteLoading: quoteMutation.isPending,
    isCheckoutLoading: checkoutMutation.isPending,
    setPostalCode: (value: string) => {
      setPostalCode(value)
      setQuote(null)
      setPostalCodeError(null)
      clearFeedback()
    },
    requestQuote,
    submitOrder,
    removeItem: cart.removeItem,
    increaseItem,
    clearFeedback
  }
}
