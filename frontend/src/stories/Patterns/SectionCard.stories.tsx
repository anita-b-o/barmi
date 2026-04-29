import type { Meta, StoryObj } from '@storybook/react'
import React from 'react'
import SectionCard from '@/components/navigation/SectionCard'
import Button from '@/components/primitives/Button'
import { theme } from '@/app/theme'
import { ShowcasePage } from '@/storybook/StorybookShowcase'

const meta = {
  title: 'Patterns/Section Card',
  component: SectionCard,
  tags: ['autodocs']
} satisfies Meta<typeof SectionCard>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <ShowcasePage title="SectionCard" description="A representative shared section shell used in operational and checkout flows.">
      <SectionCard
        title="Resumen económico"
        description="Section-level chrome for grouped information and actions."
        action={<Button variant="secondary">Exportar</Button>}
      >
        <div style={{ display: 'grid', gap: theme.spacing.sm }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: theme.spacing.lg }}>
            <span style={{ color: theme.colors.textMuted }}>Subtotal</span>
            <strong>$ 12.500</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: theme.spacing.lg }}>
            <span style={{ color: theme.colors.textMuted }}>Envío</span>
            <strong>$ 1.200</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: theme.spacing.lg }}>
            <span style={{ color: theme.colors.textMuted }}>Total</span>
            <strong>$ 13.700</strong>
          </div>
        </div>
      </SectionCard>
    </ShowcasePage>
  )
}
