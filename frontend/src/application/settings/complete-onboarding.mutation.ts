import { defineMutation } from '#application/shared/define-mutation'
import { useDomainMutation } from '#application/shared/use-domain-mutation'
import type { ApiError } from '#domain/shared/api-error'
import type { Result } from '#domain/shared/result'

export const completeOnboardingMutation = defineMutation<
  Result<{ status: 'completed' }, ApiError>,
  void
>({
  mutationFn: (connector) => connector.completeOnboarding(),
})

export function useCompleteOnboarding() {
  return useDomainMutation(completeOnboardingMutation)
}
