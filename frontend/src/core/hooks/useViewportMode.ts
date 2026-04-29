import { useEffect, useState } from 'react'
import { theme } from '@/app/theme'

export type ViewportMode = 'mobile' | 'tablet' | 'desktop'

function getViewportMode(width: number): ViewportMode {
  if (width < theme.breakpoints.md) return 'mobile'
  if (width < theme.breakpoints.lg) return 'tablet'
  return 'desktop'
}

export function useViewportMode() {
  const [mode, setMode] = useState<ViewportMode>(() => {
    if (typeof window === 'undefined') return 'desktop'
    return getViewportMode(window.innerWidth)
  })

  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    const onResize = () => setMode(getViewportMode(window.innerWidth))
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return mode
}
