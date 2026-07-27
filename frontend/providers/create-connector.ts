import { HttpArrConnector } from '#infrastructure/http/http-arr-connector'
import { fakeArrConnector } from '#infrastructure/fake/fake-arr-connector'
import type { ArrConnector } from '#domain/interfaces/arr-connector'

/**
 * Composition root: the only place allowed to import both
 * `infrastructure/http` and `infrastructure/fake` directly — `application`
 * and `presentation` are both barred from depending on `infrastructure`
 * (cf. .dependency-cruiser.cjs), same as backend's `providers/`, which is
 * why this file sits outside `src/` too, instead of in `application/shared`
 * where docs/phase-0/01-arborescence.md originally placed the connector
 * selection logic.
 */
export function createConnector(cookieHeader?: string): ArrConnector {
  if (import.meta.env.VITE_CONNECTOR === 'fake') return fakeArrConnector
  return new HttpArrConnector(cookieHeader)
}
