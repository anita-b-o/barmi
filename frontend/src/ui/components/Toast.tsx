import React, { useEffect } from 'react'
import { theme } from '../theme/theme'

type ToastVariant = 'success' | 'error' | 'info'

type ToastProps = {
  id: string
  message: string
  variant?: ToastVariant
  duration?: number
  onClose: (id: string) => void
}

const variantStyles: Record<ToastVariant, { background: string; color: string; border: string }> = {
  success: { background: '#E6F4EA', color: theme.colors.success, border: `1px solid ${theme.colors.success}` },
  error: { background: theme.colors.primarySoft, color: theme.colors.danger, border: `1px solid ${theme.colors.danger}` },
  info: { background: '#E7EEF9', color: theme.colors.info, border: `1px solid ${theme.colors.info}` }
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
        boxShadow: theme.shadows.soft,
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
