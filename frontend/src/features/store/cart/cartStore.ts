import { create } from 'zustand'

type CartScope = 'STORE' | 'ECOSYSTEM'

type CartItem = {
  key: string
  kind: CartScope
  storeSlug?: string
  productId: string
  name: string
  priceCents: number
}

type CartState = {
  scope: CartScope | null
  storeSlug: string | null
  items: CartItem[]
  addItem: (item: Omit<CartItem, 'key'>) => void
  clear: () => void
}

export const useCartStore = create<CartState>((set, get) => ({
  scope: null,
  storeSlug: null,
  items: [],
  addItem: (item) => {
    const st = get()
    // Invariant: cart can't mix scopes; and STORE scope can't mix stores
    if (st.scope && st.scope !== item.kind) throw new Error('Cart scope mismatch')
    if (item.kind === 'STORE') {
      if (st.storeSlug && st.storeSlug !== item.storeSlug) throw new Error('Cart store mismatch')
    }

    set({
      scope: item.kind,
      storeSlug: item.kind === 'STORE' ? (item.storeSlug ?? null) : null,
      items: [...st.items, { ...item, key: crypto.randomUUID() }]
    })
  },
  clear: () => set({ scope: null, storeSlug: null, items: [] })
}))
