import type { Meta, StoryObj } from '@storybook/react'
import React, { useState } from 'react'
import EmptyState from '@/components/feedback/EmptyState'
import LoadingState from '@/components/feedback/LoadingState'
import Toast from '@/components/feedback/Toast'
import { theme } from '@/app/theme'
import { ShowcaseGrid, ShowcasePage, ShowcaseSection } from '@/storybook/StorybookShowcase'

const meta = {
  title: 'Patterns/Feedback',
  tags: ['autodocs']
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

function ToastPreview() {
  const [visible, setVisible] = useState(true)

  return visible ? (
    <Toast id="storybook-toast" message="Zona de envío guardada correctamente." variant="success" duration={20000} onClose={() => setVisible(false)} />
  ) : (
    <div style={{ color: theme.colors.textMuted }}>Toast cerrado.</div>
  )
}

export const FeedbackStates: Story = {
  render: () => (
    <ShowcasePage title="Feedback patterns" description="Representative async and empty states using the real shared components.">
      <ShowcaseGrid min={280}>
        <LoadingState label="Cargando zonas de envío..." />
        <EmptyState
          title="No hay promociones activas"
          description="Podés crear una promoción nueva cuando quieras impulsar el catálogo."
          actionLabel="Crear promoción"
          onAction={() => undefined}
        />
        <div style={{ display: 'grid', alignItems: 'start' }}>
          <ShowcaseSection title="Toast">
            <ToastPreview />
          </ShowcaseSection>
        </div>
      </ShowcaseGrid>
    </ShowcasePage>
  )
}
