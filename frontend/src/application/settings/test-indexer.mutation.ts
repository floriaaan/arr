import { defineMutation } from '#application/shared/define-mutation'
import { useDomainMutation } from '#application/shared/use-domain-mutation'
import type { ApiError } from '#domain/shared/api-error'
import type { Result } from '#domain/shared/result'
import type { ServarrKind } from '#domain/settings/servarr-instance'
import type { IndexerRecord } from '#domain/settings/indexer-record'

export interface TestIndexerVariables {
  kind: ServarrKind
  payload: IndexerRecord
}

export const testIndexerMutation = defineMutation<Result<void, ApiError>, TestIndexerVariables>({
  mutationFn: (connector, { kind, payload }) => connector.testIndexer(kind, payload),
})

export function useTestIndexer() {
  return useDomainMutation(testIndexerMutation)
}
