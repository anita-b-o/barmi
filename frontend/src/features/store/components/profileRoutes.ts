import type { StoreReadiness } from '@/api/contracts/v1/storeAdmin'
import { routes } from '@/core/constants/routes'

export function withPublicProfileCtas(readiness: StoreReadiness | null): StoreReadiness | null {
  if (!readiness) return readiness

  return {
    ...readiness,
    steps: readiness.steps.map((step) => (
      (step.capability === 'ABOUT' || step.capability === 'CONTACT') && step.ctaRoute === routes.adminStore
        ? { ...step, ctaRoute: routes.adminStoreProfile }
        : step
    ))
  }
}
