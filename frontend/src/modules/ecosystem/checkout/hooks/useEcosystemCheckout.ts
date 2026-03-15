import { useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { appConfig } from '../../../../app/config/env'
import { extractBackendErrorMessage } from '../../../../core/errors'
import { useEcosystemCart } from '../../../../ui/state/ecosystemCartContext'
import type { EcosystemShippingQuoteRes } from '../../../../api/contracts/v1/ecosystem'
import { ecosystemAdapter, publicEcosystemAdapter } from '../api'
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
      setError(mapCheckoutError(mutationError))
    }
  })

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      const ecosystem = ecosystemQuery.data
      if (!ecosystem) throw new Error('No se pudo resolver el ecosystem actual.')
      return ecosystemAdapter.checkout({
        ecosystemId: ecosystem.id,
        items: cartItems.map((item) => ({ externalProductId: item.externalProductId, qty: item.qty })),
        shipping: quote?.available ? { postalCode: postalCode.trim() } : undefined
      })
    },
    onError: (mutationError) => {
      setError(mapCheckoutError(mutationError))
    }
  })

  const preview = useMemo<EcosystemCheckoutPreview>(() => {
    const shippingCostAmount = quote?.available ? quote.costAmount ?? 0 : 0
    const currency = quote?.currency ?? cartItems[0]?.currency ?? 'ARS'
    return {
      items: cartItems,
      postalCode,
      subtotalAmount,
      shippingCostAmount,
      totalAmount: subtotalAmount + shippingCostAmount,
      currency,
      canQuoteShipping
    }
  }, [cartItems, canQuoteShipping, postalCode, quote, subtotalAmount])

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

  const submitOrder = async (): Promise<EcosystemCheckoutSuccessState | null> => {
    if (cartItems.length === 0) {
      setError('El carrito está vacío.')
      return null
    }
    if (canQuoteShipping && postalCode.trim() && !quote) {
      setError('Cotizá el envío antes de crear la orden o vaciá el código postal.')
      return null
    }
    const ecosystem = ecosystemQuery.data
    if (!ecosystem) {
      setError('No se pudo resolver el ecosystem actual.')
      return null
    }
    const submittedItems = [...cartItems]
    const order = await checkoutMutation.mutateAsync()
    cart.clear()
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
    error: ecosystemQuery.error ? mapCheckoutError(ecosystemQuery.error) : error,
    postalCode,
    postalCodeError,
    preview,
    isLoading: ecosystemQuery.isLoading,
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
    increaseItem,
    decreaseItem,
    clearCart: cart.clear,
    clearFeedback
  }
}
