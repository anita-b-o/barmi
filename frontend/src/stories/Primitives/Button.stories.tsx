import type { Meta, StoryObj } from '@storybook/react'
import React from 'react'
import Button from '@/components/primitives/Button'
import { theme } from '@/app/theme'
import { ShowcasePage, ShowcaseSection } from '@/storybook/StorybookShowcase'

const meta = {
  title: 'Primitives/Button',
  component: Button,
  tags: ['autodocs']
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

export const Variants: Story = {
  args: {
    variant: 'primary',
    children: 'Action'
  },
  render: () => (
    <ShowcasePage title="Button" description="Primary, secondary, and ghost actions using the real shared primitive.">
      <ShowcaseSection title="Variants">
        <div style={{ display: 'flex', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
          <Button variant="primary">Create order</Button>
          <Button variant="secondary">Review details</Button>
          <Button variant="ghost">Skip for now</Button>
        </div>
      </ShowcaseSection>

      <ShowcaseSection title="States">
        <div style={{ display: 'flex', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
          <Button variant="primary" disabled>Primary disabled</Button>
          <Button variant="secondary" disabled>Secondary disabled</Button>
          <Button variant="ghost" disabled>Ghost disabled</Button>
          <Button variant="primary" autoFocus>Focused primary</Button>
        </div>
      </ShowcaseSection>
    </ShowcasePage>
  )
}
