import { useEffect } from 'react'
import { buildCanonicalUrl, resolveSeoMetadata, type SeoRobots } from './seoMetadata'

export type JsonLdValue =
  | string
  | number
  | boolean
  | null
  | JsonLdValue[]
  | { [key: string]: JsonLdValue | undefined }

export type JsonLdInput = {
  id: string
  path: string
  robots?: SeoRobots
  data: JsonLdValue | null
}

const SCRIPT_SELECTOR = 'script[type="application/ld+json"][data-barmi-jsonld="true"]'
const SENSITIVE_KEY_FRAGMENTS = ['email', 'token', 'secret', 'password', 'admin']

function isSensitiveKey(key: string) {
  const normalizedKey = key.toLowerCase()
  return normalizedKey === 'id' ||
    normalizedKey.endsWith('id') ||
    normalizedKey === 'identifier' ||
    normalizedKey.endsWith('identifier') ||
    normalizedKey === 'sku' ||
    SENSITIVE_KEY_FRAGMENTS.some((fragment) => normalizedKey.includes(fragment))
}

function normalizeJsonLdId(id: string) {
  return `barmi-jsonld-${id.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'route'}`
}

function sanitizeJsonLd(value: JsonLdValue | undefined): JsonLdValue | undefined {
  if (value === undefined || value === null) return undefined
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed || undefined
  }
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined
  if (typeof value === 'boolean') return value
  if (Array.isArray(value)) {
    const items = value.map((item) => sanitizeJsonLd(item)).filter((item): item is JsonLdValue => item !== undefined)
    return items.length > 0 ? items : undefined
  }

  const entries = Object.entries(value)
    .filter(([key]) => !isSensitiveKey(key))
    .map(([key, item]) => [key, sanitizeJsonLd(item)] as const)
    .filter((entry): entry is readonly [string, JsonLdValue] => entry[1] !== undefined)

  return entries.length > 0 ? Object.fromEntries(entries) as JsonLdValue : undefined
}

function removeManagedJsonLdExcept(scriptId?: string) {
  document.head.querySelectorAll<HTMLScriptElement>(SCRIPT_SELECTOR).forEach((script) => {
    if (!scriptId || script.id !== scriptId) script.remove()
  })
}

export function applyJsonLd(input: JsonLdInput, origin = window.location.origin) {
  const scriptId = normalizeJsonLdId(input.id)
  const metadata = resolveSeoMetadata({
    title: 'JSON-LD',
    description: 'JSON-LD',
    path: input.path,
    robots: input.robots
  }, origin)
  const isIndexable = metadata.robots === 'index,follow'
  const hasCleanCanonical = metadata.canonicalUrl === buildCanonicalUrl(metadata.path, origin)
  const hasQueryParams = window.location.search.length > 0
  const sanitized = sanitizeJsonLd(input.data)

  if (!isIndexable || !hasCleanCanonical || hasQueryParams || !sanitized) {
    removeManagedJsonLdExcept()
    return null
  }

  removeManagedJsonLdExcept(scriptId)

  let script = document.head.querySelector<HTMLScriptElement>(`#${scriptId}`)
  if (!script) {
    script = document.createElement('script')
    script.type = 'application/ld+json'
    script.id = scriptId
    script.dataset.barmiJsonld = 'true'
    document.head.appendChild(script)
  }
  script.textContent = JSON.stringify(sanitized)
  return sanitized
}

export function useJsonLd(input: JsonLdInput) {
  useEffect(() => {
    applyJsonLd(input)
    return () => removeManagedJsonLdExcept()
  }, [input.data, input.id, input.path, input.robots])
}
