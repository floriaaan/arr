import { defineMutation } from '#application/shared/define-mutation'
import { useDomainMutation } from '#application/shared/use-domain-mutation'
import type { ApiError } from '#domain/shared/api-error'
import type { Result } from '#domain/shared/result'
import type { ServarrKind } from '#domain/settings/servarr-instance'
import type { InstanceProfileDto, InstanceProfileDraft } from '#domain/settings/instance-profile'

export interface UpdateInstanceProfileVariables {
  kind: ServarrKind
  id: string
  draft: InstanceProfileDraft
}

export const updateInstanceProfileMutation = defineMutation<
  Result<InstanceProfileDto, ApiError>,
  UpdateInstanceProfileVariables
>({
  mutationFn: (connector, { kind, id, draft }) => connector.updateInstanceProfile(kind, id, draft),
})

export function useUpdateInstanceProfile() {
  return useDomainMutation(updateInstanceProfileMutation)
}
