import React from 'react'
import { getContextPalette, theme, type VisualContext } from '@/app/theme'
import { BetaFeedbackWidget } from '@/features/beta'

type PlatformLayoutProps = {
  children: React.ReactNode
  customHeader?: React.ReactNode
  eyebrow?: string
  title?: string
  subtitle?: string
  navigation?: React.ReactNode
  headerMeta?: React.ReactNode
  headerActions?: React.ReactNode
  context?: VisualContext
  contentPaddingTop?: string
  feedbackStoreId?: string
  feedbackStoreSlug?: string
  feedbackEcosystemSlug?: string
}

export default function PlatformLayout({
  children,
  customHeader,
  eyebrow,
  title = 'Barmi',
  subtitle,
  navigation,
  headerMeta,
  headerActions,
  context = 'neutral',
  contentPaddingTop = `clamp(${theme.spacing.lg}px, 2.2vw, ${theme.spacing.xl}px)`,
  feedbackStoreId,
  feedbackStoreSlug,
  feedbackEcosystemSlug
}: PlatformLayoutProps) {
  const palette = getContextPalette(context)

  return (
    <div
      style={{
        minHeight: '100vh',
        background: theme.colors.bgPage,
        color: theme.colors.textPrimary
      }}
    >
      {customHeader ? (
        customHeader
      ) : (
        <div
          style={{
            padding: `clamp(6px, 1vw, ${theme.spacing.sm}px) clamp(${theme.spacing.lg}px, 3vw, ${theme.spacing.xl}px)`,
            borderBottom: `1px solid ${theme.colors.borderDefault}`,
            background: theme.colors.bgSurfaceAlt,
            backdropFilter: 'none',
            position: 'sticky',
            top: 0,
            zIndex: 10
          }}
        >
          <div style={{ maxWidth: 1180, margin: '0 auto', display: 'grid', gap: theme.spacing.sm }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: theme.spacing.md, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ minWidth: 0, flex: '1 1 320px', display: 'flex', gap: theme.spacing.sm, alignItems: 'center', flexWrap: 'wrap' }}>
                <div
                  style={{
                    minWidth: 0,
                    flex: '0 1 auto',
                    display: 'grid',
                    gap: 2,
                    padding: `6px ${theme.spacing.md}px`,
                    borderRadius: theme.radius.lg,
                    background: theme.colors.bgSurfaceAlt,
                    border: `1px solid ${theme.colors.borderDefault}`
                  }}
                >
                  {eyebrow ? <div style={{ color: palette.accent, fontWeight: 700, fontSize: theme.typography.small.size, letterSpacing: 0, textTransform: 'uppercase' }}>{eyebrow}</div> : null}
                  <div style={{ fontWeight: 700, fontSize: 'clamp(20px, 3vw, 22px)', color: theme.colors.textPrimary, letterSpacing: 0 }}>{title}</div>
                </div>

                {(subtitle || headerMeta) ? (
                  <div
                    style={{
                      minWidth: 0,
                      flex: '1 1 320px',
                      display: 'grid',
                      gap: 2,
                      padding: `6px ${theme.spacing.md}px`,
                      borderRadius: theme.radius.lg,
                      background: theme.colors.bgSurfaceAlt,
                      border: `1px solid ${theme.colors.borderDefault}`
                    }}
                  >
                    {subtitle ? <div style={{ color: theme.colors.textMuted, lineHeight: 1.35 }}>{subtitle}</div> : null}
                    {headerMeta ? <div style={{ display: 'flex', gap: theme.spacing.sm, flexWrap: 'wrap' }}>{headerMeta}</div> : null}
                  </div>
                ) : null}
              </div>

              {headerActions ? (
                <div
                  style={{
                    display: 'flex',
                    gap: theme.spacing.sm,
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    justifyContent: 'flex-end',
                    flex: '1 1 240px'
                  }}
                >
                  {headerActions}
                </div>
              ) : null}
            </div>

            {navigation ? (
              <div
                style={{
                  display: 'flex',
                  gap: 12,
                  alignItems: 'center',
                  flexWrap: 'nowrap',
                  padding: '0 2px',
                  overflowX: 'auto',
                  maxWidth: '100%',
                  WebkitOverflowScrolling: 'touch',
                  scrollbarWidth: 'none'
                }}
              >
                {navigation}
              </div>
            ) : null}
          </div>
        </div>
      )}
      <main
        style={{
          maxWidth: 1180,
          margin: '0 auto',
          padding: `${contentPaddingTop} clamp(${theme.spacing.lg}px, 3vw, ${theme.spacing.xl}px) ${theme.spacing.xxxl}px`
        }}
      >
        {children}
      </main>
      <BetaFeedbackWidget
        storeId={feedbackStoreId}
        storeSlug={feedbackStoreSlug}
        ecosystemSlug={feedbackEcosystemSlug}
      />
    </div>
  )
}
