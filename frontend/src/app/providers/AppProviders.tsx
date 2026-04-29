import React from 'react'
import { CssBaseline } from '@mui/material'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/core/auth'
import ThemeGlobalStyles from '@/app/theme/ThemeGlobalStyles'
import { ThemeModeProvider } from '@/app/theme/ThemeModeProvider'
import { CartProvider } from '@/features/store/cart/cartContext'
import { EcosystemCartProvider } from '@/features/ecosystem/cart/ecosystemCartContext'

export function createAppQueryClient() {
  return new QueryClient()
}

type AppProvidersProps = {
  children: React.ReactNode
  queryClient?: QueryClient
  withStrictMode?: boolean
}

function ProvidersTree({ children, queryClient }: { children: React.ReactNode; queryClient: QueryClient }) {
  return (
    <ThemeModeProvider>
      <CssBaseline />
      <ThemeGlobalStyles />
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <CartProvider>
            <EcosystemCartProvider>
              {children}
            </EcosystemCartProvider>
          </CartProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeModeProvider>
  )
}

export function AppProviders({
  children,
  queryClient = createAppQueryClient(),
  withStrictMode = true
}: AppProvidersProps) {
  const tree = <ProvidersTree queryClient={queryClient}>{children}</ProvidersTree>
  return withStrictMode ? <React.StrictMode>{tree}</React.StrictMode> : tree
}
