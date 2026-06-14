import { alpha, theme, useTheme, type ThemePreference } from '@/app/theme'

const options: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'Sistema' },
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Oscuro' }
]

export default function ThemeToggle() {
  const { themePreference, resolvedTheme, setThemePreference } = useTheme()

  return (
    <div
      role="radiogroup"
      aria-label={`Tema visual. Tema activo: ${resolvedTheme === 'dark' ? 'oscuro' : 'claro'}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 2,
        padding: 3,
        borderRadius: theme.radius.md,
        border: `1px solid ${theme.colors.borderDefault}`,
        background: theme.colors.bgSurface,
        maxWidth: '100%',
        overflowX: 'auto'
      }}
    >
      {options.map((option) => {
        const selected = themePreference === option.value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={`Usar tema ${option.label.toLowerCase()}`}
            onClick={() => setThemePreference(option.value)}
            style={{
              minHeight: 34,
              padding: '7px 10px',
              border: `1px solid ${selected ? theme.colors.borderAccentSoft : 'transparent'}`,
              borderRadius: theme.radius.sm,
              background: selected ? alpha(theme.colors.actionPrimary, 0.14) : 'transparent',
              color: selected ? theme.colors.textPrimary : theme.colors.textSecondary,
              fontWeight: selected ? 700 : 600,
              fontSize: theme.typography.small.size,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              letterSpacing: 0
            }}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
