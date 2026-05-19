import type { Meta, StoryObj } from '@storybook/react'
import React from 'react'
import Input from '@/components/primitives/Input'
import { theme } from '@/app/theme'
import { ShowcasePage, ShowcaseSection } from '@/storybook/StorybookShowcase'

const meta = {
  title: 'Primitives/Input',
  component: Input,
  tags: ['autodocs']
} satisfies Meta<typeof Input>

export default meta
type Story = StoryObj<typeof meta>

export const States: Story = {
  args: {
    'aria-label': 'Input'
  },
  render: () => (
    <ShowcasePage title="Input" description="Current primitive states. The component does not expose a custom error variant yet, so the story stays aligned with the real implementation.">
      <ShowcaseSection title="Examples">
        <div style={{ display: 'grid', gap: theme.spacing.md, maxWidth: 420 }}>
          <Input defaultValue="Pedido Barmi 2026" aria-label="Default input" />
          <Input placeholder="Buscar por nombre o SKU" aria-label="Placeholder input" />
          <Input defaultValue="Solo lectura visual" disabled aria-label="Disabled input" />
          <Input defaultValue="Focused input" autoFocus aria-label="Focused input" />
        </div>
      </ShowcaseSection>
    </ShowcasePage>
  )
}
