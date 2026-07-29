import { defineMutation } from '#application/shared/define-mutation'
import { useDomainMutation } from '#application/shared/use-domain-mutation'
import type { ApiError } from '#domain/shared/api-error'
import type { Result } from '#domain/shared/result'
import type { ServarrKind } from '#domain/settings/servarr-instance'

export interface DeleteQualityProfileVariables {
  kind: ServarrKind
  id: number
}

export const deleteQualityProfileMutation = defineMutation<
  Result<void, ApiError>,
  DeleteQualityProfileVariables
>({
  mutationFn: (connector, { kind, id }) => connector.deleteQualityProfile(kind, id),
})

export function useDeleteQualityProfile() {
  return useDomainMutation(deleteQualityProfileMutation)
}
