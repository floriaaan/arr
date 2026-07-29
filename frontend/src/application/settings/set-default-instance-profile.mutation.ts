import { defineMutation } from '#application/shared/define-mutation'
import { useDomainMutation } from '#application/shared/use-domain-mutation'
import type { ApiError } from '#domain/shared/api-error'
import type { Result } from '#domain/shared/result'
import type { ServarrKind } from '#domain/settings/servarr-instance'
import type { InstanceProfileDto } from '#domain/settings/instance-profile'

export interface SetDefaultInstanceProfileVariables {
  kind: ServarrKind
  id: string
}

export const setDefaultInstanceProfileMutation = defineMutation<
  Result<InstanceProfileDto, ApiError>,
  SetDefaultInstanceProfileVariables
>({
  mutationFn: (connector, { kind, id }) => connector.setDefaultInstanceProfile(kind, id),
})

export function useSetDefaultInstanceProfile() {
  return useDomainMutation(setDefaultInstanceProfileMutation)
}
