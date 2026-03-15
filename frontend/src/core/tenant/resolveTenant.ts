export type TenantScope = 'STORE' | 'ECOSYSTEM' | 'UNKNOWN'

export type TenantContext = {
  host: string
  slug: string | null
  scope: TenantScope
  isLocalhost: boolean
}

const RESERVED_SUBDOMAINS = new Set(['www', 'app', 'admin', 'ecosystem', 'public'])

export function resolveTenantFromHost(hostname: string): TenantContext {
  const normalizedHost = hostname.toLowerCase()
  const hostWithoutPort = normalizedHost.split(':')[0]
  const segments = hostWithoutPort.split('.').filter(Boolean)
  const isLocalhost = hostWithoutPort === 'localhost' || hostWithoutPort.endsWith('.localhost')

  if (segments.length === 0) {
    return { host: hostWithoutPort, slug: null, scope: 'UNKNOWN', isLocalhost }
  }

  const subdomain = segments.length > 2 ? segments[0] : null
  const slug = subdomain && !RESERVED_SUBDOMAINS.has(subdomain) ? subdomain : null

  return {
    host: hostWithoutPort,
    slug,
    scope: slug ? 'STORE' : 'UNKNOWN',
    isLocalhost
  }
}

export function getBrowserTenantContext(): TenantContext {
  if (typeof window === 'undefined') {
    return { host: '', slug: null, scope: 'UNKNOWN', isLocalhost: false }
  }
  return resolveTenantFromHost(window.location.host)
}
