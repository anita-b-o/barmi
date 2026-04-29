import type { Preview } from '@storybook/react'
import React from 'react'
import { StorybookProviders } from '../src/storybook/StorybookProviders'

const preview: Preview = {
  globalTypes: {
    themeMode: {
      name: 'Theme mode',
      description: 'Preview stories using the real app theme mode',
      defaultValue: 'light',
      toolbar: {
        icon: 'mirror',
        items: [
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' }
        ]
      }
    }
  },
  parameters: {
    layout: 'padded',
    controls: {
      expanded: true
    },
    backgrounds: {
      disable: true
    }
  },
  decorators: [
    (Story, context) => (
      <StorybookProviders mode={context.globals.themeMode === 'dark' ? 'dark' : 'light'}>
        <Story />
      </StorybookProviders>
    )
  ]
}

export default preview
