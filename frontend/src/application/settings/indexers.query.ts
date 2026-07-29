import { defineQuery } from '#application/shared/define-query'
import { useDomainQuery } from '#application/shared/use-domain-query'
import type { IndexerRecord } from '#domain/settings/indexer-record'
import type { ServarrKind } from '#domain/settings/servarr-instance'
import type { ApiError } from '#domain/shared/api-error'
import type { Result } from '#domain/shared/result'

export const indexersQuery = defineQuery<Result<IndexerRecord[], ApiError>, [ServarrKind]>({
  key: (kind) => ['indexers', kind],
  queryFn: (connector, kind) => connector.listIndexers(kind),
})

export function useIndexers(kind: ServarrKind, enabled = true) {
  return useDomainQuery(indexersQuery, [kind], { enabled })
}
