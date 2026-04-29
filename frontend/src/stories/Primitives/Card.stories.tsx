import type { Meta, StoryObj } from '@storybook/react'
import React from 'react'
import Card from '@/components/primitives/Card'
import Badge from '@/components/primitives/Badge'
import { theme } from '@/app/theme'
import { ShowcaseGrid, ShowcasePage } from '@/storybook/StorybookShowcase'

const meta = {
  title: 'Primitives/Card',
  component: Card,
  tags: ['autodocs']
} satisfies Meta<typeof Card>

export default meta
type Story = StoryObj<typeof meta>

export const Variants: Story = {
  render: () => (
    <ShowcasePage title="Card" description="Standard surface and soft card treatments used throughout the product. Hover styling is built into the primitive.">
      <ShowcaseGrid>
        <Card style={{ display: 'grid', gap: theme.spacing.md }}>
          <Badge variant="neutral">Surface</Badge>
          <div style={{ fontWeight: 700 }}>Operational summary</div>
          <div style={{ color: theme.colors.textSecondary }}>Use this variant for standard product surfaces and section panels.</div>
        </Card>
        <Card variant="soft" style={{ display: 'grid', gap: theme.spacing.md }}>
          <Badge variant="info">Soft</Badge>
          <div style={{ fontWeight: 700 }}>Highlighted context</div>
          <div style={{ color: theme.colors.textSecondary }}>Use this variant when the section should feel lighter or more contextual.</div>
        </Card>
      </ShowcaseGrid>
    </ShowcasePage>
  )
}
