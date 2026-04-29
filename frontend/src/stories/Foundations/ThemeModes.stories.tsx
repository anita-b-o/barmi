import type { Meta, StoryObj } from '@storybook/react'
import React from 'react'
import Badge from '@/components/primitives/Badge'
import Button from '@/components/primitives/Button'
import Card from '@/components/primitives/Card'
import Input from '@/components/primitives/Input'
import { theme } from '@/app/theme'
import { ShowcaseGrid, ShowcasePage } from '@/storybook/StorybookShowcase'

const meta = {
  title: 'Foundations/Theme Modes',
  tags: ['autodocs']
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

function ThemeModePreview() {
  return (
    <ShowcasePage
      title={`Theme mode: ${theme.mode}`}
      description="Use the toolbar to switch between light and dark. The preview uses the real theme-mode provider and global styles from the app."
    >
      <ShowcaseGrid min={260}>
        <Card style={{ display: 'grid', gap: theme.spacing.md }}>
          <div style={{ display: 'grid', gap: 6 }}>
            <strong>Action preview</strong>
            <div style={{ color: theme.colors.textSecondary }}>Buttons, cards, badges, and inputs should all respond to the active runtime theme.</div>
          </div>
          <div style={{ display: 'flex', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
            <Button variant="primary">Primary action</Button>
            <Button variant="secondary">Secondary action</Button>
            <Button variant="ghost">Ghost action</Button>
          </div>
          <div style={{ display: 'flex', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
            <Badge variant="neutral">Neutral</Badge>
            <Badge variant="success">Success</Badge>
            <Badge variant="warning">Warning</Badge>
            <Badge variant="error">Error</Badge>
          </div>
          <Input placeholder="Search products or stores" />
        </Card>
      </ShowcaseGrid>
    </ShowcasePage>
  )
}

export const LightMode: Story = {
  globals: { themeMode: 'light' },
  render: () => <ThemeModePreview />
}

export const DarkMode: Story = {
  globals: { themeMode: 'dark' },
  render: () => <ThemeModePreview />
}
