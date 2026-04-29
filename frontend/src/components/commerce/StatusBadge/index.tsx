import React from 'react'
import Badge from '@/components/primitives/Badge'

type StatusBadgeProps = {
  status: string
}

function mapVariant(status: string) {
  const normalized = status.toUpperCase()
  if (['PAID', 'APPROVED', 'ACTIVE', 'ENVIADO', 'SHIPPED'].includes(normalized)) return 'success'
  if (['PENDING', 'PENDING_PAYMENT'].includes(normalized)) return 'warning'
  if (['STOCK_CONFLICT'].includes(normalized)) return 'error'
  if (['CANCELLED', 'FAILED', 'INACTIVE'].includes(normalized)) return 'error'
  return 'neutral'
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  return <Badge variant={mapVariant(status)}>{status}</Badge>
}
