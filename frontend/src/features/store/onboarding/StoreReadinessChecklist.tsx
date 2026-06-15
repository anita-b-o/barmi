import { Link } from 'react-router-dom'
import type { CSSProperties } from 'react'
import type { StoreReadiness } from '@/api/contracts/v1/storeAdmin'
import { theme } from '@/app/theme'
import Badge from '@/components/primitives/Badge'
import Button from '@/components/primitives/Button'

type StoreReadinessChecklistProps = {
  readiness: StoreReadiness
  compact?: boolean
}

const styles = {
  progressTrack: {
    height: 10,
    borderRadius: theme.radius.pill,
    background: theme.colors.bgHover,
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    borderRadius: theme.radius.pill,
    background: theme.colors.actionPrimary
  },
  stepList: {
    display: 'grid',
    gap: theme.spacing.sm,
    margin: 0,
    padding: 0,
    listStyle: 'none'
  },
  step: {
    display: 'grid',
    gap: theme.spacing.sm,
    gridTemplateColumns: 'minmax(0, 1fr) auto',
    alignItems: 'center',
    padding: theme.spacing.md,
    border: `1px solid ${theme.colors.borderDefault}`,
    borderRadius: theme.radius.md,
    background: theme.colors.bgSurface
  },
  stepMain: {
    display: 'flex',
    gap: theme.spacing.sm,
    alignItems: 'center',
    minWidth: 0
  },
  stepLabel: {
    fontWeight: 650,
    overflowWrap: 'anywhere'
  },
  icon: {
    width: 24,
    height: 24,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.pill,
    fontWeight: 800,
    flex: '0 0 auto'
  },
  actions: {
    display: 'flex',
    gap: theme.spacing.sm,
    alignItems: 'center',
    justifyContent: 'flex-end',
    flexWrap: 'wrap'
  }
} satisfies Record<string, CSSProperties>

export function StoreReadinessChecklist({ readiness, compact = false }: StoreReadinessChecklistProps) {
  const visibleSteps = compact ? readiness.steps.filter((step) => step.blocksPublishing || !step.completed).slice(0, 5) : readiness.steps

  return (
    <div style={{ display: 'grid', gap: theme.spacing.lg }}>
      <div style={{ display: 'grid', gap: theme.spacing.sm }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: theme.spacing.md, alignItems: 'center', flexWrap: 'wrap' }}>
          <strong>{readiness.score}% completado</strong>
          <Badge variant={readiness.publishReady ? 'success' : 'warning'}>
            {readiness.publishReady ? 'Lista para publicar' : 'Faltan pasos'}
          </Badge>
        </div>
        <div
          role="progressbar"
          aria-label="Progreso para publicar tu tienda"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={readiness.score}
          style={styles.progressTrack}
        >
          <div style={{ ...styles.progressFill, width: `${Math.max(0, Math.min(100, readiness.score))}%` }} />
        </div>
      </div>

      <ul style={styles.stepList}>
        {visibleSteps.map((step) => {
          const future = !step.implemented
          const iconColor = step.completed ? theme.colors.success : future ? theme.colors.textMuted : theme.colors.error
          const iconBackground = step.completed ? theme.colors.statusSuccessSoft : future ? theme.colors.bgHover : theme.colors.statusErrorSoft
          const iconLabel = step.completed ? '✓' : future ? 'i' : '×'

          return (
            <li key={step.id} style={styles.step}>
              <div style={styles.stepMain}>
                <span
                  aria-hidden="true"
                  style={{
                    ...styles.icon,
                    color: iconColor,
                    background: iconBackground
                  }}
                >
                  {iconLabel}
                </span>
                <span style={styles.stepLabel}>{step.label}</span>
              </div>
              <div style={styles.actions}>
                {!step.completed && step.required ? <Badge variant="warning">Necesario</Badge> : null}
                {step.ctaRoute && (!step.completed || !step.blocksPublishing) ? (
                  <Link to={step.ctaRoute} style={{ textDecoration: 'none' }}>
                    <Button variant="secondary">{step.ctaLabel}</Button>
                  </Link>
                ) : null}
                {future ? <Badge variant="neutral">Próximamente</Badge> : null}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
