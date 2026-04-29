# Frontend Architecture

## Structure

```text
src/
  app/            # App bootstrapping, providers, router, theme
  core/           # Cross-cutting runtime concerns: auth, api, config, tenant, hooks, utils
  features/       # Domain logic and feature-specific api/hooks/components/state/types
  layouts/        # Layout shells without domain logic
  components/     # Shared UI building blocks and navigation/form helpers
  pages/          # Route composition layer only
  assets/         # Static assets
  test-utils/     # Shared frontend test setup/helpers
  __tests__/      # Frontend tests
```

## Layer Responsibilities

- `app`: initializes the application, router, providers, and app theme.
- `core`: owns cross-feature concerns. It must not depend on `features` or `pages`.
- `features`: owns domain behavior. Put feature api clients, hooks, state, types, view models, and feature-bound UI here.
- `layouts`: shared page shells. Keep them domain-agnostic.
- `components`: reusable UI that is not tied to a specific domain. `components/navigation` may compose shared navigation states, `components/forms` holds form atoms, `components/ui` holds generic building blocks.
- `pages`: route entrypoints. Pages should orchestrate layouts + features and avoid direct domain implementation.
- `test-utils`: shared rendering, auth/session mocking and async helpers for Vitest.

## Import Rules

- `app` can import from any lower layer.
- `pages` can import from `features`, `components`, `layouts`, and `core`.
- `features` must not import from `pages`.
- `components` must not import from `pages` and must stay domain-agnostic.
- `core` must not import from `features` or `pages`.
- `layouts` must not contain domain logic.

## Path Aliases

- `@/app`
- `@/core`
- `@/features`
- `@/components`
- `@/layouts`
- `@/pages`
- `@/assets`

Use aliases for cross-layer imports and avoid deep relatives when crossing top-level folders.

## Placement Guide

- New routed screens: `pages/*` as thin wrappers over feature components.
- Store/cart/ecosystem/order behavior: `features/*`.
- Shared auth/session/api helpers: `core/*`.
- Generic button/card/table/form atoms: `components/*`.
- Access control UI state shared by pages and guards: `components/navigation/*`.

## UX Conventions

- Loading states: use `LoadingBlock` for async screen and section loading. Keep labels explicit about the resource being fetched.
- Error states: use `ErrorAlert` for recoverable failures. When the user can retry, provide `actionLabel="Reintentar"` and wire it to the local reload/refetch handler.
- Empty states: use `EmptyState` for zero-data outcomes. Add a short description when filters or search explain the empty result, and use the optional CTA only when there is a clear next step.
- Success feedback: destructive or mutating admin actions should surface a short toast (`ToastContainer`) on success and on actionable failures.
- Disabled states: submit and action buttons must disable while the request is in flight or when required local inputs are still missing.

## Form Conventions

- Keep local validation lightweight and visible before submit: required fields, basic numeric bounds, basic email shape, and inconsistent ranges.
- Prefer reusing the screen-level error area or modal error area instead of sprinkling inline validation text everywhere.
- Prevent double submit by disabling the primary action while the request is pending.
- On success, reset the form only when that matches the existing workflow. Do not clear user input on failed requests.

## Examples

- A new store-admin workflow: `features/shipping/store-zones/{api,hooks,components,types}` and a thin `pages/admin/*` wrapper.
- A reusable empty/error/loading primitive: `components/ui/*` or `components/feedback/*`.
- A new route guard helper: `core/auth/*`.

## Validation Commands

- `npm run lint`
- `npm run lint:imports`
- `npm run check:architecture`
- `npm run check:design-system`
- `npm run audit:design-system`
- `npm run build`
- `CI=1 ./node_modules/.bin/vitest run src/__tests__/routing.test.tsx src/__tests__/admin-members.test.tsx src/__tests__/ui-feedback.test.tsx --api.port=0`

`check:architecture` validates:

- forbidden layer dependencies (`features -> pages`, `core -> features/pages`, `components -> pages`)
- legacy paths such as `ui`, `modules`, and `screens`
- deep relative imports that should use `@/...`
- basic import cycles across `src`
