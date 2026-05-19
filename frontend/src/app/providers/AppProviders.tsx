import React from 'react'
import { CssBaseline } from '@mui/material'
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/core/auth'
import ThemeGlobalStyles from '@/app/theme/ThemeGlobalStyles'
import { ThemeModeProvider } from '@/app/theme/ThemeModeProvider'
import { CartProvider } from '@/features/store/cart/cartContext'
import { EcosystemCartProvider } from '@/features/ecosystem/cart/ecosystemCartContext'
import { reportHttpError, reportMutationError, reportQueryError } from '@/app/observability/client'

export function createAppQueryClient() {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => {
        reportQueryError(error, {
          queryKey: Array.isArray(query.queryKey) ? query.queryKey.join(':') : String(query.queryKey ?? ''),
          queryHash: query.queryHash
        })
        reportHttpError(error, {
          source: 'react_query',
          queryKey: Array.isArray(query.queryKey) ? query.queryKey.join(':') : String(query.queryKey ?? '')
        })
      }
    }),
    mutationCache: new MutationCache({
      onError: (error, _variables, _context, mutation) => {
        reportMutationError(error, {
          mutationKey: Array.isArray(mutation.options.mutationKey)
            ? mutation.options.mutationKey.join(':')
            : String(mutation.options.mutationKey ?? '')
        })
        reportHttpError(error, {
          source: 'react_mutation',
          mutationKey: Array.isArray(mutation.options.mutationKey)
            ? mutation.options.mutationKey.join(':')
            : String(mutation.options.mutationKey ?? '')
        })
      }
    }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        retry: false
      },
      mutations: {
        retry: 0
      }
    }
  })
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
