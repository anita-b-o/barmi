import React, { createContext, useContext, useEffect, useMemo, useReducer } from 'react'

type EcosystemCartItem = {
  externalProductId: string
  name: string
  unitPriceAmount: number
  qty: number
  currency: string
  deliverySupported?: boolean
}

type EcosystemCartState = {
  items: EcosystemCartItem[]
}

type EcosystemCartActions = {
  addItem: (item: Omit<EcosystemCartItem, 'qty'>) => void
  removeItem: (externalProductId: string) => void
  setQuantity: (externalProductId: string, qty: number) => void
  clear: () => void
}

type EcosystemCartContextValue = EcosystemCartState & EcosystemCartActions

const STORAGE_KEY = 'barmi.ecosystemCart.v1'

const initialState: EcosystemCartState = {
  items: []
}

function isValidQuantity(qty: number) {
  return Number.isInteger(qty) && Number.isFinite(qty)
}

function isValidCartItemInput(item: Omit<EcosystemCartItem, 'qty'>) {
  return (
    item.externalProductId.trim().length > 0 &&
    item.name.trim().length > 0 &&
    Number.isFinite(item.unitPriceAmount) &&
    item.unitPriceAmount >= 0 &&
    item.currency.trim().length > 0
  )
}

type Action =
  | { type: 'ADD_ITEM'; item: Omit<EcosystemCartItem, 'qty'> }
  | { type: 'REMOVE_ITEM'; externalProductId: string }
  | { type: 'SET_QUANTITY'; externalProductId: string; qty: number }
  | { type: 'CLEAR' }
  | { type: 'SET_STATE'; state: EcosystemCartState }

function isValidState(state: unknown): state is EcosystemCartState {
  if (!state || typeof state !== 'object') return false
  const data = state as { items?: unknown }
  if (!Array.isArray(data.items)) return false
  return data.items.every((item) => {
    if (!item || typeof item !== 'object') return false
    const v = item as Record<string, unknown>
    return (
      typeof v.externalProductId === 'string' &&
      v.externalProductId.trim().length > 0 &&
      typeof v.name === 'string' &&
      typeof v.unitPriceAmount === 'number' &&
      Number.isFinite(v.unitPriceAmount) &&
      v.unitPriceAmount >= 0 &&
      typeof v.qty === 'number' &&
      Number.isInteger(v.qty) &&
      v.qty > 0 &&
      typeof v.currency === 'string' &&
      v.currency.trim().length > 0 &&
      (typeof v.deliverySupported === 'boolean' || typeof v.deliverySupported === 'undefined')
    )
  })
}

function initState(): EcosystemCartState {
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

function reducer(state: EcosystemCartState, action: Action): EcosystemCartState {
  switch (action.type) {
    case 'SET_STATE':
      return action.state
    case 'CLEAR':
      return initialState
    case 'ADD_ITEM': {
      if (!isValidCartItemInput(action.item)) return state
      const existing = state.items.find((item) => item.externalProductId === action.item.externalProductId)
      if (existing) {
        return {
          items: state.items.map((item) =>
            item.externalProductId === action.item.externalProductId ? { ...item, ...action.item, qty: item.qty + 1 } : item
          )
        }
      }
      return {
        items: [...state.items, { ...action.item, qty: 1 }]
      }
    }
    case 'REMOVE_ITEM': {
      const existing = state.items.find((item) => item.externalProductId === action.externalProductId)
      if (!existing) return state
      const nextItems = existing.qty <= 1
        ? state.items.filter((item) => item.externalProductId !== action.externalProductId)
        : state.items.map((item) =>
            item.externalProductId === action.externalProductId ? { ...item, qty: item.qty - 1 } : item
          )
      return { items: nextItems }
    }
    case 'SET_QUANTITY': {
      if (!isValidQuantity(action.qty)) return state
      if (action.qty <= 0) {
        return { items: state.items.filter((item) => item.externalProductId !== action.externalProductId) }
      }
      return {
        items: state.items.map((item) =>
          item.externalProductId === action.externalProductId ? { ...item, qty: action.qty } : item
        )
      }
    }
    default:
      return state
  }
}

const EcosystemCartContext = createContext<EcosystemCartContextValue | null>(null)

export function EcosystemCartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initState)

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  const value = useMemo<EcosystemCartContextValue>(() => ({
    ...state,
    addItem: (item) => dispatch({ type: 'ADD_ITEM', item }),
    removeItem: (externalProductId) => dispatch({ type: 'REMOVE_ITEM', externalProductId }),
    setQuantity: (externalProductId, qty) => dispatch({ type: 'SET_QUANTITY', externalProductId, qty }),
    clear: () => dispatch({ type: 'CLEAR' })
  }), [state])

  return <EcosystemCartContext.Provider value={value}>{children}</EcosystemCartContext.Provider>
}

export function useEcosystemCart() {
  const ctx = useContext(EcosystemCartContext)
  if (!ctx) throw new Error('useEcosystemCart must be used within EcosystemCartProvider')
  return ctx
}
