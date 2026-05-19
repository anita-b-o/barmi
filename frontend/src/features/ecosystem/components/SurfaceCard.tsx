import type { HTMLAttributes } from 'react'
import Card from '@/components/primitives/Card'
import './ecosystem-marketplace.css'

type SurfaceCardVariant = 'default' | 'elevated' | 'interactive' | 'panel' | 'inverse'

type SurfaceCardProps = HTMLAttributes<HTMLDivElement> & {
  variant?: SurfaceCardVariant
  selected?: boolean
}

export function SurfaceCard({
  variant = 'default',
  selected = false,
  className = '',
  ...props
}: SurfaceCardProps) {
  const cardVariant = variant === 'inverse' ? 'inverse' : 'surface'
  const classes = [
    'ecosystem-surface-card',
    variant === 'panel' ? 'ecosystem-surface-card--panel' : '',
    variant === 'elevated' ? 'ecosystem-surface-card--elevated' : '',
    variant === 'interactive' ? 'ecosystem-surface-card--interactive' : '',
    variant === 'inverse' ? 'ecosystem-surface-card--inverse' : '',
    selected ? 'ecosystem-surface-card--selected' : '',
    className
  ].filter(Boolean).join(' ')

  return <Card {...props} className={classes} variant={cardVariant} />
}

