import { defineMutation } from '#application/shared/define-mutation'
import { useDomainMutation } from '#application/shared/use-domain-mutation'
import type { ApiError } from '#domain/shared/api-error'
import type { Result } from '#domain/shared/result'
import type { DiscoveredInstance, DiscoveryScope } from '#domain/settings/discovered-instance'

export interface DiscoverInstancesVariables extends DiscoveryScope {
  /** Onboarding and the admin settings panel scan through different endpoints. */
  duringOnboarding?: boolean
}

/**
 * A mutation rather than a query: scanning is an explicit, side-effect-shaped
 * action the user triggers, not cached state (cf.
 * docs/phase-5-quality-of-life/01, décision 7).
 */
export const discoverInstancesMutation = defineMutation<
  Result<DiscoveredInstance[], ApiError>,
  DiscoverInstancesVariables
>({
  mutationFn: (connector, { duringOnboarding, ...scope }) =>
    duringOnboarding
      ? connector.discoverOnboardingInstances(scope)
      : connector.discoverInstances(scope),
})

export function useDiscoverInstances() {
  return useDomainMutation(discoverInstancesMutation)
}
