import { defineMutation } from '#application/shared/define-mutation'
import { useDomainMutation } from '#application/shared/use-domain-mutation'
import type { InstanceProfiles } from '#domain/interfaces/arr-connector'
import type { ServarrKind } from '#domain/settings/servarr-instance'
import type { ApiError } from '#domain/shared/api-error'
import type { Result } from '#domain/shared/result'

export interface FetchInstanceProfilesVariables {
  kind: ServarrKind
  baseUrl: string
  apiKey: string
  /** Onboarding and the admin settings panel fetch from different endpoints. */
  duringOnboarding?: boolean
}

export const fetchInstanceProfilesMutation = defineMutation<
  Result<InstanceProfiles, ApiError>,
  FetchInstanceProfilesVariables
>({
  mutationFn: (connector, { kind, baseUrl, apiKey, duringOnboarding }) =>
    duringOnboarding
      ? connector.fetchInstanceProfiles(kind, baseUrl, apiKey)
      : connector.fetchSettingsInstanceProfiles(kind, baseUrl, apiKey),
})

export function useFetchInstanceProfiles() {
  return useDomainMutation(fetchInstanceProfilesMutation)
}
