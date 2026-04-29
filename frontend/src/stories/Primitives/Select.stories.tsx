import type { Meta, StoryObj } from '@storybook/react'
import React from 'react'
import Select from '@/components/primitives/Select'
import { theme } from '@/app/theme'
import { ShowcasePage, ShowcaseSection } from '@/storybook/StorybookShowcase'

const meta = {
  title: 'Primitives/Select',
  component: Select,
  tags: ['autodocs']
} satisfies Meta<typeof Select>

export default meta
type Story = StoryObj<typeof meta>

const options = [
  { value: 'default', label: 'Orden actual' },
  { value: 'price,asc', label: 'Precio menor' },
  { value: 'price,desc', label: 'Precio mayor' }
]

export const States: Story = {
  render: () => (
    <ShowcasePage title="Select" description="Shared select primitive using the same focus and surface tokens as the app.">
      <ShowcaseSection title="Examples">
        <div style={{ display: 'grid', gap: theme.spacing.md, maxWidth: 420 }}>
          <Select options={options} defaultValue="default" aria-label="Default select" />
          <Select options={options} defaultValue="price,asc" autoFocus aria-label="Focused select" />
          <Select options={options} defaultValue="default" disabled aria-label="Disabled select" />
        </div>
      </ShowcaseSection>
    </ShowcasePage>
  )
}
