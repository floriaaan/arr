import { defineMutation } from '#application/shared/define-mutation'
import { useDomainMutation } from '#application/shared/use-domain-mutation'
import type { ApiError } from '#domain/shared/api-error'
import type { Result } from '#domain/shared/result'
import type { ServarrKind } from '#domain/settings/servarr-instance'

export interface DeleteInstanceProfileVariables {
  kind: ServarrKind
  id: string
}

export const deleteInstanceProfileMutation = defineMutation<
  Result<void, ApiError>,
  DeleteInstanceProfileVariables
>({
  mutationFn: (connector, { kind, id }) => connector.deleteInstanceProfile(kind, id),
})

export function useDeleteInstanceProfile() {
  return useDomainMutation(deleteInstanceProfileMutation)
}
