import React from 'react'
import Toast from '@/components/feedback/Toast'
import { theme } from '@/app/theme'

type ToastItem = {
  id: string
  message: string
  variant?: 'success' | 'error' | 'info'
}

type ToastContainerProps = {
  toasts: ToastItem[]
  onClose: (id: string) => void
}

export default function ToastContainer({ toasts, onClose }: ToastContainerProps) {
  if (toasts.length === 0) return null

  return (
    <div
      style={{
        position: 'fixed',
        right: theme.spacing.lg,
        bottom: theme.spacing.lg,
        display: 'grid',
        gap: theme.spacing.sm,
        zIndex: 60,
        minWidth: 260
      }}
    >
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          id={toast.id}
          message={toast.message}
          variant={toast.variant}
          onClose={onClose}
        />
      ))}
    </div>
  )
}
