import { useEffect, useState } from 'react'
import { alpha, theme } from '@/app/theme'
import {
  getBackendConnectionState,
  subscribeBackendConnectionState,
  type BackendConnectionDetail
} from './backendConnection'

function bannerPalette(state: BackendConnectionDetail['state']) {
  if (state === 'recovered') {
    return {
      background: alpha(theme.colors.success, 0.12),
      border: alpha(theme.colors.success, 0.28),
      color: theme.colors.success
    }
  }

  return {
    background: alpha(theme.colors.warning, 0.12),
    border: alpha(theme.colors.warning, 0.3),
    color: theme.colors.warning
  }
}

export default function BackendConnectionBanner() {
  const [detail, setDetail] = useState<BackendConnectionDetail>(() => getBackendConnectionState())

  useEffect(() => subscribeBackendConnectionState(setDetail), [])

  useEffect(() => {
    if (detail.state !== 'recovered') return undefined
    const timeout = window.setTimeout(() => {
      setDetail({ state: 'idle' })
    }, 2500)
    return () => window.clearTimeout(timeout)
  }, [detail.state])

  if (detail.state === 'idle') return null

  const palette = bannerPalette(detail.state)
  const message = detail.state === 'recovered'
    ? 'Conexión recuperada. Ya podés seguir.'
    : 'Reconectando con Barmi...'

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        left: theme.spacing.lg,
        right: theme.spacing.lg,
        top: theme.spacing.lg,
        zIndex: 90,
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'none'
      }}
    >
      <div
        style={{
          width: 'min(100%, 640px)',
          padding: `${theme.spacing.sm}px ${theme.spacing.lg}px`,
          borderRadius: theme.radius.pill,
          border: `1px solid ${palette.border}`,
          background: palette.background,
          color: palette.color,
          fontWeight: 700,
          textAlign: 'center',
          boxShadow: 'none'
        }}
      >
        {message}
      </div>
    </div>
  )
}
