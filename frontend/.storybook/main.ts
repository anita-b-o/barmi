import type { StorybookConfig } from '@storybook/react-vite'
import { mergeConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-essentials', '@storybook/addon-a11y'],
  framework: {
    name: '@storybook/react-vite',
    options: {}
  },
  docs: {
    autodocs: 'tag'
  },
  viteFinal: async (config) => mergeConfig(config, {
    resolve: {
      alias: {
        '@/app': fileURLToPath(new URL('../src/app', import.meta.url)),
        '@/core': fileURLToPath(new URL('../src/core', import.meta.url)),
        '@/features': fileURLToPath(new URL('../src/features', import.meta.url)),
        '@/components': fileURLToPath(new URL('../src/components', import.meta.url)),
        '@/layouts': fileURLToPath(new URL('../src/layouts', import.meta.url)),
        '@/pages': fileURLToPath(new URL('../src/pages', import.meta.url)),
        '@/assets': fileURLToPath(new URL('../src/assets', import.meta.url))
      }
    }
  })
}

export default config
