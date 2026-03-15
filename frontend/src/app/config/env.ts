const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL
const rawPublicStoreHost = import.meta.env.VITE_PUBLIC_STORE_HOST
const rawPublicEcosystemSlug = import.meta.env.VITE_PUBLIC_ECOSYSTEM_SLUG

export const appConfig = {
  apiBaseUrl: typeof rawApiBaseUrl === 'string' ? rawApiBaseUrl : '',
  publicStoreHost: typeof rawPublicStoreHost === 'string' ? rawPublicStoreHost : '',
  publicEcosystemSlug: typeof rawPublicEcosystemSlug === 'string' ? rawPublicEcosystemSlug : 'demo-ecosystem',
  appName: 'Barmi'
} as const

export type AppConfig = typeof appConfig
