import type { Meta, StoryObj } from '@storybook/react'
import React from 'react'
import StatusBadge from '@/components/commerce/StatusBadge'
import { theme } from '@/app/theme'
import { ShowcasePage, ShowcaseSection } from '@/storybook/StorybookShowcase'

const meta = {
  title: 'Patterns/Status Badge',
  component: StatusBadge,
  tags: ['autodocs']
} satisfies Meta<typeof StatusBadge>

export default meta
type Story = StoryObj<typeof meta>

export const CommonStatuses: Story = {
  args: {
    status: 'PAID'
  },
  render: () => (
    <ShowcasePage title="StatusBadge" description="Common operational statuses mapped to the shared badge semantics.">
      <ShowcaseSection title="Examples">
        <div style={{ display: 'flex', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
          <StatusBadge status="PAID" />
          <StatusBadge status="PENDING_PAYMENT" />
          <StatusBadge status="FAILED" />
          <StatusBadge status="STOCK_CONFLICT" />
          <StatusBadge status="ACTIVE" />
        </div>
      </ShowcaseSection>
    </ShowcasePage>
  )
}
