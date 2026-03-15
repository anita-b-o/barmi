import React, { createContext, useContext, useEffect, useMemo, useReducer } from 'react'

type CartItem = {
  productId: string
  name: string
  priceCents: number
  qty: number
}

type CartState = {
  storeSlug: string | null
  items: CartItem[]
}

type CartActions = {
  addItem: (storeSlug: string, item: Omit<CartItem, 'qty'>) => void
  removeItem: (productId: string) => void
  clear: () => void
}

type CartContextValue = CartState & CartActions

const STORAGE_KEY = 'barmi.cart.v1'

const initialState: CartState = {
  storeSlug: null,
  items: []
}

type Action =
  | { type: 'ADD_ITEM'; storeSlug: string; item: Omit<CartItem, 'qty'> }
  | { type: 'REMOVE_ITEM'; productId: string }
  | { type: 'CLEAR' }
  | { type: 'SET_STATE'; state: CartState }

function isValidState(state: unknown): state is CartState {
  if (!state || typeof state !== 'object') return false
  const data = state as { storeSlug?: unknown; items?: unknown }
  if (!(data.storeSlug === null || typeof data.storeSlug === 'string')) return false
  if (!Array.isArray(data.items)) return false
  return data.items.every((item) => {
    if (!item || typeof item !== 'object') return false
    const v = item as Record<string, unknown>
    return (
      typeof v.productId === 'string' &&
      typeof v.name === 'string' &&
      typeof v.priceCents === 'number' &&
      typeof v.qty === 'number'
    )
  })
}

function initState(): CartState {
  if (typeof window === 'undefined') return initialState
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return initialState
    const parsed = JSON.parse(raw)
    if (isValidState(parsed)) return parsed
    return initialState
  } catch {
    return initialState
  }
}

function reducer(state: CartState, action: Action): CartState {
  switch (action.type) {
    case 'SET_STATE':
      return action.state
    case 'CLEAR':
      return initialState
    case 'ADD_ITEM': {
      if (state.storeSlug && state.storeSlug !== action.storeSlug) {
        return {
          storeSlug: action.storeSlug,
          items: [{ ...action.item, qty: 1 }]
        }
      }
      const existing = state.items.find((item) => item.productId === action.item.productId)
      if (existing) {
        return {
          storeSlug: action.storeSlug,
          items: state.items.map((item) =>
            item.productId === action.item.productId ? { ...item, qty: item.qty + 1 } : item
          )
        }
      }
      return {
        storeSlug: action.storeSlug,
        items: [...state.items, { ...action.item, qty: 1 }]
      }
    }
    case 'REMOVE_ITEM': {
      const existing = state.items.find((item) => item.productId === action.productId)
      if (!existing) return state
      const nextItems = existing.qty <= 1
        ? state.items.filter((item) => item.productId !== action.productId)
        : state.items.map((item) =>
            item.productId === action.productId ? { ...item, qty: item.qty - 1 } : item
          )
      return {
        storeSlug: nextItems.length === 0 ? null : state.storeSlug,
        items: nextItems
      }
    }
    default:
      return state
  }
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initState)

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  const value = useMemo<CartContextValue>(() => ({
    ...state,
    addItem: (storeSlug, item) => dispatch({ type: 'ADD_ITEM', storeSlug, item }),
    removeItem: (productId) => dispatch({ type: 'REMOVE_ITEM', productId }),
    clear: () => dispatch({ type: 'CLEAR' })
  }), [state])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
