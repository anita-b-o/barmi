import { alpha, theme } from '@/app/theme'
import Button from '@/components/primitives/Button'

type QuantitySelectorProps = {
  value: number
  onDecrease: () => void
  onIncrease: () => void
  disableDecrease?: boolean
  disableIncrease?: boolean
}

export default function QuantitySelector({
  value,
  onDecrease,
  onIncrease,
  disableDecrease = false,
  disableIncrease = false
}: QuantitySelectorProps) {
  return (
    <div
      style={{
        display: 'inline-flex',
        gap: 8,
        alignItems: 'center',
        padding: '6px 8px',
        borderRadius: theme.radius.pill,
        border: `1px solid ${alpha(theme.colors.actionPrimary, 0.14)}`,
        background: theme.colors.bgSurfaceAlt
      }}
    >
      <Button variant="secondary" onClick={onDecrease} disabled={disableDecrease} aria-label="Disminuir cantidad" style={{ minWidth: 40, minHeight: 36, padding: '8px 12px' }}>-</Button>
      <strong style={{ minWidth: 28, textAlign: 'center', color: theme.colors.textPrimary }}>{value}</strong>
      <Button variant="secondary" onClick={onIncrease} disabled={disableIncrease} aria-label="Aumentar cantidad" style={{ minWidth: 40, minHeight: 36, padding: '8px 12px' }}>+</Button>
    </div>
  )
}
