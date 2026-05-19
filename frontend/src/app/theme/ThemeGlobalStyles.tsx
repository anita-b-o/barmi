import { tokens } from './tokens'
import { useActiveThemeMode } from './ThemeModeProvider'

export default function ThemeGlobalStyles() {
  const mode = useActiveThemeMode()
  const palette = tokens.colors[mode]
  const raw = tokens.rawColors

  return (
    <style>
      {`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

        :root {
          --primary-400: ${raw.primary400};
          --primary-500: ${raw.primary500};
          --action-primary: ${raw.primary500};
          --primary-600: ${raw.primary600};
          --action-hover: ${raw.primary600};
          --success: ${raw.success};
          --warning: ${raw.warning};
          --error: ${raw.error};
          --info: ${raw.info};
          --focus-ring: ${raw.focusRing};
          --text-primary: ${palette.textPrimary};
          --text-secondary: ${palette.textSecondary};
          --text-muted: ${palette.textMuted};
          --bg-page-dark: ${raw.bgPageDark900};
          --bg-surface-dark: ${raw.bgSurfaceDark800};
          --bg-hover-dark: ${raw.bgHoverDark700};
          --border-dark: ${raw.borderDark600};
          --bg-page-light: ${raw.bgPageLight100};
          --bg-surface-light: ${raw.bgSurfaceLight200};
          --border-default: ${raw.borderDefault300};
          --action-disabled: ${palette.actionDisabled};
          --border-strong: ${raw.borderStrong400};
          --barmi-primary-400: ${raw.primary400};
          --barmi-primary-500: ${raw.primary500};
          --barmi-action-primary: ${raw.primary500};
          --barmi-primary-600: ${raw.primary600};
          --barmi-action-hover: ${raw.primary600};
          --barmi-success: ${raw.success};
          --barmi-warning: ${raw.warning};
          --barmi-error: ${raw.error};
          --barmi-info: ${raw.info};
          --barmi-bg-page-dark: ${raw.bgPageDark900};
          --barmi-bg-surface-dark: ${raw.bgSurfaceDark800};
          --barmi-bg-hover-dark: ${raw.bgHoverDark700};
          --barmi-border-dark: ${raw.borderDark600};
          --barmi-bg-page-light: ${raw.bgPageLight100};
          --barmi-bg-surface-light: ${raw.bgSurfaceLight200};
          --barmi-border-default: ${raw.borderDefault300};
          --barmi-action-disabled: ${palette.actionDisabled};
          --barmi-border-strong: ${raw.borderStrong400};
          --barmi-color-brand: ${palette.brand};
          --barmi-color-action-primary: ${palette.actionPrimary};
          --barmi-color-action-hover: ${palette.actionHover};
          --barmi-color-action-disabled: ${palette.actionDisabled};
          --barmi-color-bg-page: ${palette.bgPage};
          --barmi-color-bg-surface: ${palette.bgSurface};
          --barmi-color-bg-surface-alt: ${palette.bgSurfaceAlt};
          --barmi-color-bg-hover: ${palette.bgHover};
          --barmi-color-bg-selected: ${palette.bgSelected};
          --barmi-color-bg-accent-soft: ${palette.bgAccentSoft};
          --barmi-color-border-default: ${palette.borderDefault};
          --barmi-color-border-strong: ${palette.borderStrong};
          --barmi-color-border-hover: ${palette.borderHover};
          --barmi-color-border-accent-soft: ${palette.borderAccentSoft};
          --barmi-color-text-primary: ${palette.textPrimary};
          --barmi-color-text-secondary: ${palette.textSecondary};
          --barmi-color-text-muted: ${palette.textMuted};
          --barmi-color-success: ${palette.success};
          --barmi-color-warning: ${palette.warning};
          --barmi-color-error: ${palette.error};
          --barmi-color-info: ${palette.info};
          --barmi-color-status-success-soft: ${palette.statusSuccessSoft};
          --barmi-color-status-warning-soft: ${palette.statusWarningSoft};
          --barmi-color-status-error-soft: ${palette.statusErrorSoft};
          --barmi-color-status-info-soft: ${palette.statusInfoSoft};
          --barmi-focus-ring: ${palette.focusRing};
          --barmi-radius-sm: ${tokens.radius.sm}px;
          --barmi-radius-md: ${tokens.radius.md}px;
          --barmi-radius-lg: ${tokens.radius.lg}px;
          --barmi-radius-xl: ${tokens.radius.xl}px;
          --barmi-shadow-surface: ${tokens.shadows.surface};
          --barmi-shadow-elevated: ${tokens.shadows.elevated};
          --barmi-shadow-overlay: ${tokens.shadows.overlay};
          --barmi-shadow-soft: ${tokens.shadows.soft};
          --barmi-shadow-medium: ${tokens.shadows.medium};
          --barmi-font-family: ${tokens.typography.fontFamily};
          --barmi-space-1: ${tokens.spacing.xs}px;
          --barmi-space-2: ${tokens.spacing.sm}px;
          --barmi-space-3: ${tokens.spacing.md}px;
          --barmi-space-4: ${tokens.spacing.lg}px;
          --barmi-space-5: ${tokens.spacing.xl}px;
          --barmi-space-6: ${tokens.spacing.xxl}px;
          --barmi-space-8: ${tokens.spacing.xxxl}px;
          --barmi-space-10: ${tokens.spacing.section}px;
          --barmi-space-12: ${tokens.spacing.hero}px;
          --barmi-space-16: ${tokens.spacing.page}px;
          --barmi-shell-max-width: 1440px;
          --barmi-topbar-height: 86px;
          --barmi-font-display: ${tokens.typography.display.size}px;
          --barmi-font-h1: ${tokens.typography.h1.size}px;
          --barmi-font-h2: ${tokens.typography.h2.size}px;
          --barmi-font-h3: ${tokens.typography.h3.size}px;
          --barmi-font-body: ${tokens.typography.body.size}px;
          --barmi-font-caption: ${tokens.typography.caption.size}px;
          --barmi-font-label: ${tokens.typography.label.size}px;
        }

        html {
          background: ${palette.bgPage};
          color-scheme: ${mode};
        }

        body {
          margin: 0;
          background: ${palette.bgPage};
          color: ${palette.textPrimary};
          font-family: ${tokens.typography.fontFamily};
          font-size: ${tokens.typography.body.size}px;
          line-height: 1.5;
          text-rendering: optimizeLegibility;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        * {
          box-sizing: border-box;
        }

        a {
          color: inherit;
          text-decoration-thickness: 1px;
          text-underline-offset: 0.16em;
        }

        button,
        input,
        select,
        textarea {
          font: inherit;
        }

        ::selection {
          background: ${palette.brand};
          color: ${palette.textPrimary};
        }
      `}
    </style>
  )
}
