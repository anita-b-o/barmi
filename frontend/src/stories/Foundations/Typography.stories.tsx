import type { Meta, StoryObj } from '@storybook/react'
import React from 'react'
import { theme } from '@/app/theme'
import { ShowcasePage, ShowcaseSection } from '@/storybook/StorybookShowcase'

const meta = {
  title: 'Foundations/Typography',
  tags: ['autodocs']
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const TypeScale: Story = {
  render: () => (
    <ShowcasePage
      title="Typography"
      description="The stories below use the current theme typography roles and text semantics used across the app."
    >
      <ShowcaseSection title="Display and titles">
        <div style={{ display: 'grid', gap: theme.spacing.md }}>
          <div style={{ fontSize: theme.typography.display.size, fontWeight: theme.typography.display.weight, letterSpacing: 0 }}>
            Display heading for key moments
          </div>
          <div style={{ fontSize: theme.typography.title.size, fontWeight: theme.typography.title.weight, letterSpacing: 0 }}>
            Section title used across flows and dashboards
          </div>
        </div>
      </ShowcaseSection>

      <ShowcaseSection title="Body hierarchy">
        <div style={{ display: 'grid', gap: theme.spacing.sm }}>
          <div style={{ fontSize: theme.typography.body.size, color: theme.colors.textPrimary }}>
            Primary body copy should carry the main content and UI messaging.
          </div>
          <div style={{ fontSize: theme.typography.body.size, color: theme.colors.textSecondary }}>
            Secondary text supports context, labels, and descriptive explanations.
          </div>
          <div style={{ fontSize: theme.typography.body.size, color: theme.colors.textMuted }}>
            Muted text is reserved for metadata, hints, and low-emphasis supporting details.
          </div>
          <div style={{ fontSize: theme.typography.small.size, color: theme.colors.textMuted, textTransform: 'uppercase', letterSpacing: 0, fontWeight: 700 }}>
            Small utility label
          </div>
        </div>
      </ShowcaseSection>
    </ShowcasePage>
  )
}
