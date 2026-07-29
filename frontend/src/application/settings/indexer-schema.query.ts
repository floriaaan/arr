import { defineQuery } from '#application/shared/define-query'
import { useDomainQuery } from '#application/shared/use-domain-query'
import type { IndexerRecord } from '#domain/settings/indexer-record'
import type { ServarrKind } from '#domain/settings/servarr-instance'
import type { ApiError } from '#domain/shared/api-error'
import type { Result } from '#domain/shared/result'

export const indexerSchemaQuery = defineQuery<Result<IndexerRecord[], ApiError>, [ServarrKind]>({
  key: (kind) => ['indexer-schema', kind],
  queryFn: (connector, kind) => connector.getIndexerSchema(kind),
})

export function useIndexerSchema(kind: ServarrKind, enabled = true) {
  return useDomainQuery(indexerSchemaQuery, [kind], { enabled })
}
