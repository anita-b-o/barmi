import { Link } from 'react-router-dom'
import { alpha, theme } from '@/app/theme'

type BreadcrumbItem = {
  label: string
  href?: string
}

type BreadcrumbsProps = {
  items: BreadcrumbItem[]
}

export default function Breadcrumbs({ items }: BreadcrumbsProps) {
  if (items.length === 0) return null

  return (
    <nav aria-label="Breadcrumb" style={{ marginBottom: theme.spacing.lg }}>
      <ol
        style={{
          display: 'inline-flex',
          flexWrap: 'wrap',
          gap: 8,
          listStyle: 'none',
          margin: 0,
          padding: '8px 12px',
          borderRadius: theme.radius.pill,
          background: alpha(theme.colors.bgSurfaceAlt, 0.92),
          border: `1px solid ${theme.colors.borderDefault}`,
          boxShadow: 'none'
        }}
      >
        {items.map((item, index) => {
          const isCurrent = index === items.length - 1
          return (
            <li key={`${item.label}-${index}`} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {item.href && !isCurrent ? (
                <Link to={item.href} style={{ color: theme.colors.textMuted, textDecoration: 'none', fontWeight: 500 }}>
                  {item.label}
                </Link>
              ) : (
                <span aria-current={isCurrent ? 'page' : undefined} style={{ color: isCurrent ? theme.colors.textPrimary : theme.colors.textMuted, fontWeight: isCurrent ? 600 : 500 }}>
                  {item.label}
                </span>
              )}
              {!isCurrent ? <span style={{ color: theme.colors.brand }}>/</span> : null}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
