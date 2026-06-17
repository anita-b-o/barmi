import type { CSSProperties, ReactNode } from 'react'
import type { ResolvedStorefrontAppearance } from './types'

type StorefrontRendererProps = {
  appearance: ResolvedStorefrontAppearance
  children: ReactNode
  id?: string
  style?: CSSProperties
}

export default function StorefrontRenderer({ appearance, children, id, style }: StorefrontRendererProps) {
  return (
    <div
      id={id}
      data-appearance={appearance.dataAppearance}
      data-storefront-palette={appearance.palette.toLowerCase()}
      data-storefront-shape={appearance.shape.toLowerCase()}
      style={{
        ...appearance.cssVariables,
        ...style
      }}
    >
      {children}
    </div>
  )
}
