import React from 'react'
import MarketplaceTopbar from '@/components/navigation/MarketplaceTopbar'
import { useEcosystemCart } from '@/features/ecosystem/cart/ecosystemCartContext'
import { appConfig } from '@/app/config/env'
import { BetaFeedbackWidget } from '@/features/beta'

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
      <MarketplaceTopbar cartCount={cartCount} />
      <BetaFeedbackWidget ecosystemSlug={appConfig.publicEcosystemSlug} />
      {children}
    </>
  )
}
