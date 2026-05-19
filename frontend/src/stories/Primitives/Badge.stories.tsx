import type { Meta, StoryObj } from '@storybook/react'
import React from 'react'
import Badge from '@/components/primitives/Badge'
import { theme } from '@/app/theme'
import { ShowcasePage, ShowcaseSection } from '@/storybook/StorybookShowcase'

const meta = {
  title: 'Primitives/Badge',
  component: Badge,
  tags: ['autodocs']
} satisfies Meta<typeof Badge>

export default meta
type Story = StoryObj<typeof meta>

export const Variants: Story = {
  args: {
    variant: 'neutral',
    children: 'Badge'
  },
  render: () => (
    <ShowcasePage title="Badge" description="Semantic badge variants for neutral and status messaging.">
      <ShowcaseSection title="Variants">
        <div style={{ display: 'flex', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
          <Badge variant="neutral">Neutral</Badge>
          <Badge variant="success">Success</Badge>
          <Badge variant="warning">Warning</Badge>
          <Badge variant="error">Error</Badge>
          <Badge variant="info">Info</Badge>
        </div>
      </ShowcaseSection>
    </ShowcasePage>
  )
}
