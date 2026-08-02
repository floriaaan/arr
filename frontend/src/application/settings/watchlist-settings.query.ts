import { defineQuery } from '#application/shared/define-query'
import { useDomainQuery } from '#application/shared/use-domain-query'
import type { WatchlistSettingsDto } from '#domain/settings/watchlist-settings'

export const watchlistSettingsQuery = defineQuery<WatchlistSettingsDto, []>({
  key: () => ['watchlist-settings'],
  queryFn: (connector) => connector.getWatchlistSettings(),
})

export function useWatchlistSettings() {
  return useDomainQuery(watchlistSettingsQuery, [])
}
