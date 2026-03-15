import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    allowedHosts: ['demo-store.example.com'],
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: false, // preserva Host → multi-tenant por subdominio
      },
    },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: [
      'node_modules',
      'dist',
      'tests/**', // excluye Playwright
      '**/*.e2e.{ts,tsx}',
    ],
  },
})