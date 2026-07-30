import { defineQuery } from '#application/shared/define-query'
import { useDomainQuery } from '#application/shared/use-domain-query'
import type { DownloadClientRecord } from '#domain/settings/download-client-record'
import type { ServarrKind } from '#domain/settings/servarr-instance'
import type { ApiError } from '#domain/shared/api-error'
import type { Result } from '#domain/shared/result'

export const downloadClientsQuery = defineQuery<
  Result<DownloadClientRecord[], ApiError>,
  [ServarrKind]
>({
  key: (kind) => ['download-clients', kind],
  queryFn: (connector, kind) => connector.listDownloadClients(kind),
})

export function useDownloadClients(kind: ServarrKind, enabled = true) {
  return useDomainQuery(downloadClientsQuery, [kind], { enabled })
}
