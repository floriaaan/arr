import { defineQuery } from '#application/shared/define-query'
import { useDomainQuery } from '#application/shared/use-domain-query'
import type { OnboardingStatus } from '#domain/settings/onboarding-state'

export const onboardingStateQuery = defineQuery<{ status: OnboardingStatus }, []>({
  key: () => ['onboarding-state'],
  queryFn: (connector) => connector.getOnboardingState(),
})

export function useOnboardingState() {
  return useDomainQuery(onboardingStateQuery, [])
}
