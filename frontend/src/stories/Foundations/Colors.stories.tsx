import type { Meta, StoryObj } from '@storybook/react'
import React from 'react'
import { theme } from '@/app/theme'
import { ShowcaseGrid, ShowcasePage, ShowcaseSection, TokenSwatch } from '@/storybook/StorybookShowcase'

const meta = {
  title: 'Foundations/Colors',
  tags: ['autodocs']
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

function textColorForSwatch(value: string) {
  return value === theme.colors.textPrimary || value === theme.colors.secondary ? theme.colors.bgSurfaceAlt : theme.colors.textPrimary
}

export const SemanticPalette: Story = {
  args: {},
  render: () => (
    <ShowcasePage
      title="Color system"
      description="These stories render the live semantic token values from the app theme, so Storybook stays aligned with the real runtime palette."
    >
      <ShowcaseSection title="Actions">
        <ShowcaseGrid>
          <TokenSwatch label="actionPrimary" value={theme.colors.actionPrimary} textColor={theme.colors.bgSurfaceAlt} />
          <TokenSwatch label="actionHover" value={theme.colors.actionHover} textColor={theme.colors.bgSurfaceAlt} />
          <TokenSwatch label="actionDisabled" value={theme.colors.actionDisabled} />
          <TokenSwatch label="brand" value={theme.colors.brand} />
        </ShowcaseGrid>
      </ShowcaseSection>

      <ShowcaseSection title="Surfaces and borders">
        <ShowcaseGrid>
          <TokenSwatch label="bgPage" value={theme.colors.bgPage} />
          <TokenSwatch label="bgSurface" value={theme.colors.bgSurface} />
          <TokenSwatch label="bgSurfaceAlt" value={theme.colors.bgSurfaceAlt} />
          <TokenSwatch label="bgHover" value={theme.colors.bgHover} />
          <TokenSwatch label="bgSelected" value={theme.colors.bgSelected} />
          <TokenSwatch label="bgAccentSoft" value={theme.colors.bgAccentSoft} />
          <TokenSwatch label="borderDefault" value={theme.colors.borderDefault} />
          <TokenSwatch label="borderStrong" value={theme.colors.borderStrong} />
          <TokenSwatch label="borderHover" value={theme.colors.borderHover} />
          <TokenSwatch label="borderAccentSoft" value={theme.colors.borderAccentSoft} />
        </ShowcaseGrid>
      </ShowcaseSection>

      <ShowcaseSection title="Text">
        <ShowcaseGrid>
          <TokenSwatch label="textPrimary" value={theme.colors.textPrimary} textColor={textColorForSwatch(theme.colors.textPrimary)} />
          <TokenSwatch label="textSecondary" value={theme.colors.textSecondary} />
          <TokenSwatch label="textMuted" value={theme.colors.textMuted} />
          <TokenSwatch label="focusRing" value={theme.colors.focusRing} />
        </ShowcaseGrid>
      </ShowcaseSection>

      <ShowcaseSection title="Status colors">
        <ShowcaseGrid>
          <TokenSwatch label="success" value={theme.colors.success} />
          <TokenSwatch label="warning" value={theme.colors.warning} />
          <TokenSwatch label="error" value={theme.colors.error} />
          <TokenSwatch label="info" value={theme.colors.info} />
          <TokenSwatch label="statusSuccessSoft" value={theme.colors.statusSuccessSoft} />
          <TokenSwatch label="statusWarningSoft" value={theme.colors.statusWarningSoft} />
          <TokenSwatch label="statusErrorSoft" value={theme.colors.statusErrorSoft} />
          <TokenSwatch label="statusInfoSoft" value={theme.colors.statusInfoSoft} />
        </ShowcaseGrid>
      </ShowcaseSection>
    </ShowcasePage>
  )
}
