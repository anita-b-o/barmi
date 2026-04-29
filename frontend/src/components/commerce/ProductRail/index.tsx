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
    <div style={{ display: 'grid', gap: theme.spacing.md }}>
      <div
        style={{
          position: 'relative'
        }}
      >
        <div
          ref={railRef}
          style={{
            display: 'flex',
            gap: 10,
            overflowX: 'auto',
            overflowY: 'hidden',
            scrollSnapType: 'x proximity',
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            paddingBottom: 4,
            paddingInlineEnd: viewportMode === 'mobile' ? theme.spacing.xs : theme.spacing.sm
          }}
        >
          {items.map((item, index) => (
            <div
              key={index}
              style={{
                flex: `0 0 ${resolvedItemMinWidth}`,
                minWidth: resolvedItemMinWidth,
                maxWidth: viewportMode === 'mobile' ? '84vw' : viewportMode === 'tablet' ? '240px' : '180px',
                scrollSnapAlign: 'start'
              }}
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
              style={{
                position: 'absolute',
                left: viewportMode === 'mobile' ? 4 : -6,
                top: '40%',
                transform: 'translateY(-50%)',
                width: 28,
                height: 28,
                borderRadius: theme.radius.pill,
                border: `1px solid ${theme.mode === 'dark' ? alpha('#FFFFFF', 0.12) : alpha(theme.colors.secondary, 0.14)}`,
                background: alpha(theme.colors.bgSurfaceAlt, 0.96),
                color: theme.colors.info,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: isAtStart ? 'default' : 'pointer',
                boxShadow: 'none',
                opacity: isAtStart ? 0.42 : 1,
                zIndex: 2
              }}
            >
              <span aria-hidden="true" style={{ fontSize: 18, lineHeight: 1 }}>‹</span>
            </button>
            <button
              type="button"
              aria-label="Desplazar productos hacia la derecha"
              onClick={() => move('right')}
              disabled={isAtEnd}
              style={{
                position: 'absolute',
                right: viewportMode === 'mobile' ? 4 : -6,
                top: '40%',
                transform: 'translateY(-50%)',
                width: 28,
                height: 28,
                borderRadius: theme.radius.pill,
                border: `1px solid ${theme.mode === 'dark' ? alpha('#FFFFFF', 0.12) : alpha(theme.colors.secondary, 0.14)}`,
                background: alpha(theme.colors.bgSurfaceAlt, 0.96),
                color: theme.colors.info,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: isAtEnd ? 'default' : 'pointer',
                boxShadow: 'none',
                opacity: isAtEnd ? 0.42 : 1,
                zIndex: 2
              }}
            >
              <span aria-hidden="true" style={{ fontSize: 18, lineHeight: 1 }}>›</span>
            </button>
          </>
        ) : null}
      </div>

      <div
        style={{
          display: viewportMode === 'desktop' ? 'none' : 'flex',
          justifyContent: 'center',
          gap: theme.spacing.sm,
          alignItems: 'center'
        }}
      >
        <button
          type="button"
          aria-label="Desplazar productos hacia la izquierda"
          onClick={() => move('left')}
          disabled={!canScroll || isAtStart}
          style={{
            width: 40,
            height: 40,
            borderRadius: theme.radius.pill,
            border: `1px solid ${alpha(theme.colors.secondary, 0.1)}`,
            background: theme.colors.surface,
            color: theme.colors.secondary,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: canScroll && !isAtStart ? 'pointer' : 'default',
            boxShadow: 'none',
            opacity: canScroll && !isAtStart ? 1 : 0.45
          }}
        >
          <span aria-hidden="true" style={{ fontSize: 18, lineHeight: 1 }}>‹</span>
        </button>
        <button
          type="button"
          aria-label="Desplazar productos hacia la derecha"
          onClick={() => move('right')}
          disabled={!canScroll || isAtEnd}
          style={{
            width: 40,
            height: 40,
            borderRadius: theme.radius.pill,
            border: `1px solid ${alpha(theme.colors.secondary, 0.1)}`,
            background: theme.colors.surface,
            color: theme.colors.secondary,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: canScroll && !isAtEnd ? 'pointer' : 'default',
            boxShadow: 'none',
            opacity: canScroll && !isAtEnd ? 1 : 0.45
          }}
        >
          <span aria-hidden="true" style={{ fontSize: 18, lineHeight: 1 }}>›</span>
        </button>
      </div>
    </div>
  )
}
