import { defineMutation } from '#application/shared/define-mutation'
import { useDomainMutation } from '#application/shared/use-domain-mutation'
import type { ApiError } from '#domain/shared/api-error'
import type { Result } from '#domain/shared/result'
import type { ServarrKind } from '#domain/settings/servarr-instance'
import type { QualityProfileRecord } from '#domain/settings/quality-profile-record'

export interface CreateQualityProfileVariables {
  kind: ServarrKind
  payload: QualityProfileRecord
}

export const createQualityProfileMutation = defineMutation<
  Result<QualityProfileRecord, ApiError>,
  CreateQualityProfileVariables
>({
  mutationFn: (connector, { kind, payload }) => connector.createQualityProfile(kind, payload),
})

export function useCreateQualityProfile() {
  return useDomainMutation(createQualityProfileMutation)
}
