import React from 'react'
import Badge from '@/components/primitives/Badge'
import Button from '@/components/primitives/Button'
import Card from '@/components/primitives/Card'
import ProductGrid from '@/components/commerce/ProductGrid'
import { theme } from '@/app/theme'

type CatalogBadge = {
  label: React.ReactNode
  variant?: 'neutral' | 'success' | 'warning' | 'danger'
}

type CatalogGridItem = {
  id: string
  title: string
  subtitle?: React.ReactNode
  priceLabel: React.ReactNode
  badges?: CatalogBadge[]
  trailingBadge?: CatalogBadge | null
  actionLabel: string
  onAction: () => void
}

type CatalogGridProps = {
  items: CatalogGridItem[]
}

export default function CatalogGrid({ items }: CatalogGridProps) {
  return (
    <ProductGrid>
      {items.map((item) => (
        <Card key={item.id}>
          <div style={{ display: 'grid', gap: theme.spacing.md }}>
            {item.badges && item.badges.length > 0 ? (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {item.badges.map((badge, index) => (
                  <Badge key={`${item.id}-badge-${index}`} variant={badge.variant}>
                    {badge.label}
                  </Badge>
                ))}
              </div>
            ) : null}

            <div>
              <div style={{ fontWeight: 700, fontSize: 18, overflowWrap: 'anywhere' }}>{item.title}</div>
              {item.subtitle ? (
                <div style={{ color: theme.colors.textMuted, marginTop: 6, overflowWrap: 'anywhere' }}>{item.subtitle}</div>
              ) : null}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: theme.spacing.md, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ fontWeight: 600, minWidth: 0, overflowWrap: 'anywhere' }}>{item.priceLabel}</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end', marginLeft: 'auto' }}>
                {item.trailingBadge ? (
                  <Badge variant={item.trailingBadge.variant}>{item.trailingBadge.label}</Badge>
                ) : null}
                <Button onClick={item.onAction}>{item.actionLabel}</Button>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </ProductGrid>
  )
}
