import React, { useEffect } from 'react'
import { alpha, theme } from '@/app/theme'

type ToastVariant = 'success' | 'error' | 'info'

type ToastProps = {
  id: string
  message: string
  variant?: ToastVariant
  duration?: number
  onClose: (id: string) => void
}

const variantStyles: Record<ToastVariant, { background: string; color: string; border: string }> = {
  success: { background: alpha(theme.colors.success, 0.12), color: theme.colors.success, border: `1px solid ${alpha(theme.colors.success, 0.24)}` },
  error: { background: alpha(theme.colors.error, 0.12), color: theme.colors.error, border: `1px solid ${alpha(theme.colors.error, 0.24)}` },
  info: { background: alpha(theme.colors.info, 0.12), color: theme.colors.info, border: `1px solid ${alpha(theme.colors.info, 0.24)}` }
}

export default function Toast({ id, message, variant = 'info', duration = 2800, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => onClose(id), duration)
    return () => clearTimeout(timer)
  }, [id, duration, onClose])

  return (
    <div
      style={{
        padding: theme.spacing.md,
        borderRadius: theme.radius.md,
        boxShadow: 'none',
        background: variantStyles[variant].background,
        color: variantStyles[variant].color,
        border: variantStyles[variant].border,
        fontSize: theme.typography.body.size
      }}
    >
      {message}
    </div>
  )
}
