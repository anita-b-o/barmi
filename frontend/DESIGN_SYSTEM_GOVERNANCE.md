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

Preferred semantic tokens:

- `brand`
- `actionPrimary`
- `actionHover`
- `actionDisabled`
- `bgPage`
- `bgSurface`
- `bgSurfaceAlt`
- `bgHover`
- `bgSelected`
- `bgAccentSoft`
- `borderDefault`
- `borderStrong`
- `borderHover`
- `borderAccentSoft`
- `textPrimary`
- `textSecondary`
- `textMuted`
- `success`
- `warning`
- `error`
- `info`
- `statusSuccessSoft`
- `statusWarningSoft`
- `statusErrorSoft`
- `statusInfoSoft`
- `focusRing`

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

These are still tolerated only as transitional debt, and the guardrails track regressions:

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
- `src/features/ecosystem/stores-map/components/StoresMap.tsx`

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
- Raw `rgb(...)` and `rgba(...)` are blocked by baseline outside explicit exceptions.
- Deprecated theme aliases are blocked outright.
- Transitional aliases are baseline-tracked so counts must not grow.
- Files with heavy inline visual styling are reported as warnings to guide refactors.

## Maintenance

The baseline lives in `scripts/design-system-baseline.json`.

- If a cleanup reduces baseline debt, update the baseline file downward.
- Do not raise the baseline casually.
- If a new exception is needed, prefer fixing the styling first; add an exception only when the file is genuinely art-directed or overlay-heavy.
