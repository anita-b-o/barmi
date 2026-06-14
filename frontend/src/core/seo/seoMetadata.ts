import { useEffect } from 'react'

export type SeoRobots = 'index,follow' | 'noindex,follow' | 'noindex,nofollow'

export type SeoMetadataInput = {
  title: string
  description: string
  path: string
  robots?: SeoRobots
}

type ResolvedSeoMetadata = Required<SeoMetadataInput> & {
  canonicalUrl: string
}

const DEFAULT_ROBOTS: SeoRobots = 'index,follow'

function normalizePath(path: string) {
  const trimmedPath = path.trim()
  if (!trimmedPath) return '/'
  const [pathWithoutQuery] = trimmedPath.split(/[?#]/)
  return pathWithoutQuery.startsWith('/') ? pathWithoutQuery : `/${pathWithoutQuery}`
}

export function buildCanonicalUrl(path: string, origin = window.location.origin) {
  const normalizedOrigin = origin.replace(/\/+$/, '')
  return `${normalizedOrigin}${normalizePath(path)}`
}

export function resolveSeoMetadata(input: SeoMetadataInput, origin = window.location.origin): ResolvedSeoMetadata {
  const path = normalizePath(input.path)
  return {
    title: input.title,
    description: input.description,
    path,
    robots: input.robots ?? DEFAULT_ROBOTS,
    canonicalUrl: buildCanonicalUrl(path, origin)
  }
}

function upsertMeta(selector: string, attributes: Record<string, string>) {
  let element = document.head.querySelector<HTMLMetaElement>(selector)
  if (!element) {
    element = document.createElement('meta')
    document.head.appendChild(element)
  }
  Object.entries(attributes).forEach(([key, value]) => element?.setAttribute(key, value))
}

function upsertCanonical(href: string) {
  let element = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!element) {
    element = document.createElement('link')
    element.setAttribute('rel', 'canonical')
    document.head.appendChild(element)
  }
  element.setAttribute('href', href)
}

export function applySeoMetadata(input: SeoMetadataInput, origin = window.location.origin) {
  const metadata = resolveSeoMetadata(input, origin)

  document.title = metadata.title
  upsertMeta('meta[name="description"]', { name: 'description', content: metadata.description })
  upsertMeta('meta[name="robots"]', { name: 'robots', content: metadata.robots })
  upsertMeta('meta[property="og:title"]', { property: 'og:title', content: metadata.title })
  upsertMeta('meta[property="og:description"]', { property: 'og:description', content: metadata.description })
  upsertMeta('meta[property="og:url"]', { property: 'og:url', content: metadata.canonicalUrl })
  upsertCanonical(metadata.canonicalUrl)

  return metadata
}

export function useSeoMetadata(input: SeoMetadataInput) {
  useEffect(() => {
    applySeoMetadata(input)
  }, [input.description, input.path, input.robots, input.title])
}
