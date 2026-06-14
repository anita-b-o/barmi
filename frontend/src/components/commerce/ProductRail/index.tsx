import type { CSSProperties } from 'react'
import React, { Children, useEffect, useRef, useState } from 'react'
import { alpha, theme } from '@/app/theme'
import { useViewportMode } from '@/core/hooks/useViewportMode'

type ProductRailProps = {
  children: React.ReactNode
  itemMinWidth?: {
    mobile?: string
    tablet?: string
    desktop?: string
  }
}

type RailViewportMode = ReturnType<typeof useViewportMode>

const productRailStyles = {
  root: { display: 'grid', gap: theme.spacing.md },
  viewport: { position: 'relative' },
  railBase: {
    display: 'flex',
    gap: 10,
    overflowX: 'auto',
    overflowY: 'hidden',
    scrollSnapType: 'x proximity',
    WebkitOverflowScrolling: 'touch',
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
    paddingBottom: 4
  },
  itemBase: { scrollSnapAlign: 'start' },
  overlayButtonBase: {
    position: 'absolute',
    top: '40%',
    transform: 'translateY(-50%)',
    width: 28,
    height: 28,
    borderRadius: theme.radius.pill,
    border: `1px solid ${alpha(theme.colors.textPrimary, theme.mode === 'dark' ? 0.12 : 0.14)}`,
    background: alpha(theme.colors.bgSurfaceAlt, 0.96),
    color: theme.colors.info,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: 'none',
    zIndex: 2
  },
  mobileControls: {
    display: 'flex',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    alignItems: 'center'
  },
  mobileControlsHidden: {
    display: 'none',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    alignItems: 'center'
  },
  mobileButtonBase: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.pill,
    border: `1px solid ${alpha(theme.colors.textPrimary, 0.1)}`,
    background: theme.colors.bgSurface,
    color: theme.colors.textPrimary,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: 'none'
  },
  arrowIcon: { fontSize: 18, lineHeight: 1 }
} satisfies Record<string, CSSProperties>

function railStyle(viewportMode: RailViewportMode): CSSProperties {
  return {
    ...productRailStyles.railBase,
    paddingInlineEnd: viewportMode === 'mobile' ? theme.spacing.xs : theme.spacing.sm
  }
}

function itemStyle(viewportMode: RailViewportMode, resolvedItemMinWidth: string): CSSProperties {
  return {
    ...productRailStyles.itemBase,
    flex: `0 0 ${resolvedItemMinWidth}`,
    minWidth: resolvedItemMinWidth,
    maxWidth: viewportMode === 'mobile' ? '84vw' : viewportMode === 'tablet' ? '240px' : '180px'
  }
}

function overlayButtonStyle(viewportMode: RailViewportMode, side: 'left' | 'right', disabled: boolean): CSSProperties {
  return {
    ...productRailStyles.overlayButtonBase,
    [side]: viewportMode === 'mobile' ? 4 : -6,
    cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.42 : 1
  }
}

function mobileButtonStyle(enabled: boolean): CSSProperties {
  return {
    ...productRailStyles.mobileButtonBase,
    cursor: enabled ? 'pointer' : 'default',
    opacity: enabled ? 1 : 0.45
  }
}

export default function ProductRail({ children, itemMinWidth }: ProductRailProps) {
  const viewportMode = useViewportMode()
  const railRef = useRef<HTMLDivElement | null>(null)
  const items = Children.toArray(children)
  const [isAtStart, setIsAtStart] = useState(true)
  const [isAtEnd, setIsAtEnd] = useState(false)
  const [canScroll, setCanScroll] = useState(false)
  const resolvedItemMinWidth = viewportMode === 'mobile'
    ? (itemMinWidth?.mobile ?? '84vw')
    : viewportMode === 'tablet'
      ? (itemMinWidth?.tablet ?? '320px')
      : (itemMinWidth?.desktop ?? '252px')

  useEffect(() => {
    const rail = railRef.current
    if (!rail) return

    const updateScrollState = () => {
      setCanScroll(rail.scrollWidth - rail.clientWidth > 8)
      setIsAtStart(rail.scrollLeft <= 8)
      setIsAtEnd(rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 8)
    }

    updateScrollState()
    window.addEventListener('resize', updateScrollState)
    rail.addEventListener('scroll', updateScrollState, { passive: true })

    return () => {
      window.removeEventListener('resize', updateScrollState)
      rail.removeEventListener('scroll', updateScrollState)
    }
  }, [items.length, viewportMode])

  const move = (direction: 'left' | 'right') => {
    const rail = railRef.current
    if (!rail) return
    const amount = Math.max(rail.clientWidth * 0.88, viewportMode === 'mobile' ? 240 : 280)
    rail.scrollBy({
      left: direction === 'right' ? amount : -amount,
      behavior: 'smooth'
    })
  }

  return (
    <div style={productRailStyles.root}>
      <div
        style={productRailStyles.viewport}
      >
        <div
          ref={railRef}
          style={railStyle(viewportMode)}
        >
          {items.map((item, index) => (
            <div
              key={index}
              style={itemStyle(viewportMode, resolvedItemMinWidth)}
            >
              {item}
            </div>
          ))}
        </div>

        {canScroll ? (
          <>
            <button
              type="button"
              aria-label="Desplazar productos hacia la izquierda"
              onClick={() => move('left')}
              disabled={isAtStart}
              style={overlayButtonStyle(viewportMode, 'left', isAtStart)}
            >
              <span aria-hidden="true" style={productRailStyles.arrowIcon}>‹</span>
            </button>
            <button
              type="button"
              aria-label="Desplazar productos hacia la derecha"
              onClick={() => move('right')}
              disabled={isAtEnd}
              style={overlayButtonStyle(viewportMode, 'right', isAtEnd)}
            >
              <span aria-hidden="true" style={productRailStyles.arrowIcon}>›</span>
            </button>
          </>
        ) : null}
      </div>

      <div
        style={viewportMode === 'desktop' ? productRailStyles.mobileControlsHidden : productRailStyles.mobileControls}
      >
        <button
          type="button"
          aria-label="Desplazar productos hacia la izquierda"
          onClick={() => move('left')}
          disabled={!canScroll || isAtStart}
          style={mobileButtonStyle(canScroll && !isAtStart)}
        >
          <span aria-hidden="true" style={productRailStyles.arrowIcon}>‹</span>
        </button>
        <button
          type="button"
          aria-label="Desplazar productos hacia la derecha"
          onClick={() => move('right')}
          disabled={!canScroll || isAtEnd}
          style={mobileButtonStyle(canScroll && !isAtEnd)}
        >
          <span aria-hidden="true" style={productRailStyles.arrowIcon}>›</span>
        </button>
      </div>
    </div>
  )
}
