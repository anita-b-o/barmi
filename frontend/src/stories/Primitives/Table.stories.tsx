import type { Meta, StoryObj } from '@storybook/react'
import React from 'react'
import Badge from '@/components/primitives/Badge'
import Table from '@/components/primitives/Table'
import { ShowcasePage, ShowcaseSection } from '@/storybook/StorybookShowcase'

const meta = {
  title: 'Primitives/Table',
  component: Table,
  tags: ['autodocs']
} satisfies Meta<typeof Table>

export default meta
type Story = StoryObj<typeof meta>

export const BasicUsage: Story = {
  args: {
    headers: ['Pedido', 'Cliente', 'Estado', 'Total'],
    rows: []
  },
  render: () => (
    <ShowcasePage title="Table" description="Representative table chrome using the shared primitive.">
      <ShowcaseSection title="Rows">
        <Table
          headers={['Pedido', 'Cliente', 'Estado', 'Total']}
          rows={[
            ['ORD-2026-001', 'Ana Torres', <Badge variant="success">PAID</Badge>, '$ 12.500'],
            ['ORD-2026-002', 'Juan Perez', <Badge variant="warning">PENDING</Badge>, '$ 8.700'],
            ['ORD-2026-003', 'Mica Suarez', <Badge variant="error">FAILED</Badge>, '$ 3.200']
          ]}
        />
      </ShowcaseSection>
    </ShowcasePage>
  )
}

export const Empty: Story = {
  args: {
    headers: ['Pedido', 'Cliente', 'Estado', 'Total'],
    rows: []
  },
  render: () => (
    <ShowcasePage title="Table" description="The primitive also owns the standard empty treatment.">
      <ShowcaseSection title="Empty state">
        <Table headers={['Pedido', 'Cliente', 'Estado', 'Total']} rows={[]} emptyMessage="Todavía no hay órdenes para mostrar" />
      </ShowcaseSection>
    </ShowcasePage>
  )
}
