# Design-System Governance

## Source Of Truth

Use the existing theme and primitives first:

- `src/app/theme/tokens.ts`
- `src/app/theme/theme.ts`
- `src/app/theme/ThemeGlobalStyles.tsx`
- `src/components/primitives/Button`
- `src/components/primitives/Input`
- `src/components/primitives/Select`
- `src/components/primitives/Card`
- `src/components/primitives/Badge`
- `src/components/primitives/Table`

## Theme System v1

Barmi supports three user preferences:

- `system` (default)
- `light`
- `dark`

The app stores the preference in `localStorage` under `barmi-theme-mode`. `system` follows `prefers-color-scheme`; `light` and `dark` are explicit user choices. The resolved runtime theme is always `light` or `dark` and is applied to `document.documentElement` as `data-theme="light|dark"` plus `color-scheme`.

Use these public theme APIs:

- `ThemeProvider` / `ThemeModeProvider`
- `useTheme()`
- `resolvedTheme`
- `themePreference`
- `setThemePreference(preference)`
- `ThemeToggle`

`ThemeToggle` is intentionally mounted only in admin chrome for v1. Do not add it to public storefront or checkout layouts until those surfaces are intentionally reviewed.

## Migrated Surfaces

Admin chrome is the first production surface migrated to Design System v1. The migrated scope is:

- `AdminLayout`
- admin sidebar and topbar shell
- primary admin navigation links
- active, hover, and focus states for admin navigation
- admin hub entry cards in the home/store/ecosystem admin hubs

This migration deliberately excludes checkout, public storefront, backend behavior, route changes, deep admin tables, and feature-specific screens outside hub/card entry points.

Future migrations should move one coherent surface at a time. A surface is ready when its page shell, navigation, core cards/panels, interactive states, and light/dark rendering can all use semantic tokens without changing business logic or user flows. Prefer finishing a narrow surface completely over partially tokenizing unrelated screens.

Preferred semantic tokens:

- `actionPrimary`
- `actionHover`
- `bgPage`
- `bgSurface`
- `bgSurfaceAlt`
- `bgHover`
- `textPrimary`
- `textSecondary`
- `textMuted`
- `borderDefault`
- `borderStrong`
- `actionDisabled`
- `focusRing`
- `success`
- `warning`
- `error`
- `info`

Additional supported semantic aliases for existing primitives and soft surfaces:

- `brand`
- `bgSelected`
- `bgAccentSoft`
- `borderHover`
- `borderAccentSoft`
- `statusSuccessSoft`
- `statusWarningSoft`
- `statusErrorSoft`
- `statusInfoSoft`

Policy:

- Product UI must consume semantic tokens through `theme.colors.*`.
- New reusable visual decisions belong in `tokens.ts` before they spread.
- Do not hardcode theme-specific colors in screens or feature components.
- Do not branch component code manually on light/dark unless a semantic token cannot express the need.
- Keep public checkout/product surfaces stable unless a PR is explicitly scoped to migrate them.

## Forbidden By Default

Do not introduce these in normal product UI code:

- hardcoded hex colors like `#fff`, `#F65F55`, `#1F2A44`
- hardcoded `rgb(...)` or `rgba(...)`
- removed legacy aliases:
  - `theme.colors.background`
  - `theme.colors.danger`
  - `theme.colors.secondarySoft`
  - `theme.colors.primaryHover`
  - `theme.colors.secondaryMedium`
  - `theme.colors.surfaceAlt`

These legacy aliases have no accepted product UI usages. Do not introduce them:

- `theme.colors.primary`
- `theme.colors.secondary`
- `theme.colors.surface`
- `theme.colors.border`

## Prefer Primitives Over Local Styling

Prefer shared primitives before writing view-level visual rules.

- Buttons: use `Button` variants for CTA, secondary, and ghost actions.
- Inputs and selects: use `Input` and `Select` instead of local border/focus/background styling.
- Cards and panels: start with `Card` before inventing another section shell.
- Status and labels: use `Badge` variants instead of local semantic colors.
- Tables and row chrome: prefer `Table` and shared commerce/navigation wrappers.

Local visual styling is acceptable when it is:

- layout-only spacing or flex/grid composition
- a tightly scoped data visualization or map overlay
- a tightly scoped one-off that does not duplicate an existing primitive pattern

If a screen keeps restyling the same visual pattern, move that pattern into a primitive or semantic token instead.

## Explicit Exceptions

Raw colors are allowed only in the theme layer and the explicitly art-directed files below:

- `src/app/theme/**`
- `src/components/primitives/Modal/ConfirmDialog.tsx`
- `src/components/primitives/Modal/index.tsx`
- `src/features/ecosystem/components/EcosystemExperience.tsx`

If a new file needs this status, document the reason and add it deliberately to the guardrail exception list in `scripts/design-system-rules.mjs`.

## Guardrail Commands

- `npm run check:design-system`
  - blocking guardrail check for new regressions
- `npm run audit:design-system`
  - reports current counts and hotspots
- `npm run lint`
  - architecture + design-system checks

## How The Guardrails Work

- Raw hex colors are blocked outside explicit exceptions.
- Raw `rgb(...)` and `rgba(...)` are blocked outside explicit exceptions.
- Deprecated theme aliases are blocked outright.
- Transitional aliases are baseline-tracked at zero so they must not be reintroduced.
- Files with heavy inline visual styling are reported as warnings to guide refactors.

## Maintenance

The baseline lives in `scripts/design-system-baseline.json`.

- If a cleanup reduces baseline debt, update the baseline file downward.
- Do not raise the baseline casually.
- If a new exception is needed, prefer fixing the styling first; add an exception only when the file is genuinely art-directed or overlay-heavy.

## Accepted Transitional Debt

As of the current baseline, the accepted baseline-tracked debt is:

- 0 discouraged legacy alias usages.
- 0 baseline-tracked raw `rgb(...)`/`rgba(...)` usages outside explicit exceptions.
- Raw colors inside the theme layer and explicit art-directed exceptions listed above.

New product work should use semantic tokens and primitives instead of increasing the baseline.
