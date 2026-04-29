import React from 'react'
import EcosystemTopbar from '@/components/navigation/EcosystemTopbar'
import { useEcosystemCart } from '@/features/ecosystem/cart/ecosystemCartContext'

export default function EcosystemLayout({
  children
}: {
  children: React.ReactNode
  contentPaddingTop?: string
}) {
  const { items } = useEcosystemCart()
  const cartCount = items.reduce((total, item) => total + item.qty, 0)

  return (
    <>
      <EcosystemTopbar cartCount={cartCount} />
      {children}
    </>
  )
}
