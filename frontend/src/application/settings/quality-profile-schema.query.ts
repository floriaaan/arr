import { defineQuery } from '#application/shared/define-query'
import { useDomainQuery } from '#application/shared/use-domain-query'
import type { QualityProfileRecord } from '#domain/settings/quality-profile-record'
import type { ServarrKind } from '#domain/settings/servarr-instance'
import type { ApiError } from '#domain/shared/api-error'
import type { Result } from '#domain/shared/result'

export const qualityProfileSchemaQuery = defineQuery<
  Result<QualityProfileRecord, ApiError>,
  [ServarrKind]
>({
  key: (kind) => ['quality-profile-schema', kind],
  queryFn: (connector, kind) => connector.getQualityProfileSchema(kind),
})

export function useQualityProfileSchema(kind: ServarrKind, enabled: boolean) {
  return useDomainQuery(qualityProfileSchemaQuery, [kind], { enabled })
}
