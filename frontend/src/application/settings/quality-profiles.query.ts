import { defineQuery } from '#application/shared/define-query'
import { useDomainQuery } from '#application/shared/use-domain-query'
import type { QualityProfileRecord } from '#domain/settings/quality-profile-record'
import type { ServarrKind } from '#domain/settings/servarr-instance'
import type { ApiError } from '#domain/shared/api-error'
import type { Result } from '#domain/shared/result'

export const qualityProfilesQuery = defineQuery<
  Result<QualityProfileRecord[], ApiError>,
  [ServarrKind]
>({
  key: (kind) => ['quality-profiles', kind],
  queryFn: (connector, kind) => connector.listQualityProfiles(kind),
})

export function useQualityProfiles(kind: ServarrKind, enabled = true) {
  return useDomainQuery(qualityProfilesQuery, [kind], { enabled })
}
