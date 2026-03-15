import React from 'react'
import { CssBaseline } from '@mui/material'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '../../core/auth'
import { CartProvider } from '../../ui/state/cartContext'
import { EcosystemCartProvider } from '../../ui/state/ecosystemCartContext'

const queryClient = new QueryClient()

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <React.StrictMode>
      <CssBaseline />
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <CartProvider>
            <EcosystemCartProvider>
              {children}
            </EcosystemCartProvider>
          </CartProvider>
        </AuthProvider>
      </QueryClientProvider>
    </React.StrictMode>
  )
}
