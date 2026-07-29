import { defineMutation } from '#application/shared/define-mutation'
import { useDomainMutation } from '#application/shared/use-domain-mutation'
import type { ApiError } from '#domain/shared/api-error'
import type { Result } from '#domain/shared/result'
import type { ServarrKind } from '#domain/settings/servarr-instance'
import type { InstanceProfileDto, InstanceProfileDraft } from '#domain/settings/instance-profile'

export interface CreateInstanceProfileVariables {
  kind: ServarrKind
  draft: InstanceProfileDraft
}

export const createInstanceProfileMutation = defineMutation<
  Result<InstanceProfileDto, ApiError>,
  CreateInstanceProfileVariables
>({
  mutationFn: (connector, { kind, draft }) => connector.createInstanceProfile(kind, draft),
})

export function useCreateInstanceProfile() {
  return useDomainMutation(createInstanceProfileMutation)
}
