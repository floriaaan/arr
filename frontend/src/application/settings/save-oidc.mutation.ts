import { defineMutation } from '#application/shared/define-mutation'
import { useDomainMutation } from '#application/shared/use-domain-mutation'
import type { OidcConfigInput } from '#domain/interfaces/arr-connector'
import type { ApiError } from '#domain/shared/api-error'
import type { Result } from '#domain/shared/result'

export interface SaveOidcVariables {
  config: OidcConfigInput | null
  duringOnboarding?: boolean
}

export const saveOidcMutation = defineMutation<
  Result<{ oidcEnabled: boolean }, ApiError>,
  SaveOidcVariables
>({
  mutationFn: (connector, { config, duringOnboarding }) =>
    duringOnboarding ? connector.saveOnboardingSso(config) : connector.updateSso(config),
})

export function useSaveOidc() {
  return useDomainMutation(saveOidcMutation)
}
