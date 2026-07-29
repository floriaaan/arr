import { defineMutation } from '#application/shared/define-mutation'
import { useDomainMutation } from '#application/shared/use-domain-mutation'
import type { ApiError } from '#domain/shared/api-error'
import type { Result } from '#domain/shared/result'
import type { ServarrKind } from '#domain/settings/servarr-instance'
import type { QualityProfileRecord } from '#domain/settings/quality-profile-record'

export interface UpdateQualityProfileVariables {
  kind: ServarrKind
  id: number
  payload: QualityProfileRecord
}

export const updateQualityProfileMutation = defineMutation<
  Result<QualityProfileRecord, ApiError>,
  UpdateQualityProfileVariables
>({
  mutationFn: (connector, { kind, id, payload }) =>
    connector.updateQualityProfile(kind, id, payload),
})

export function useUpdateQualityProfile() {
  return useDomainMutation(updateQualityProfileMutation)
}
