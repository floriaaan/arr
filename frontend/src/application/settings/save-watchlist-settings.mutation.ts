import { defineMutation } from '#application/shared/define-mutation'
import { useDomainMutation } from '#application/shared/use-domain-mutation'
import type { WatchlistSettingsDto } from '#domain/settings/watchlist-settings'
import type { ApiError } from '#domain/shared/api-error'
import type { Result } from '#domain/shared/result'

export const saveWatchlistSettingsMutation = defineMutation<
  Result<WatchlistSettingsDto, ApiError>,
  WatchlistSettingsDto
>({
  mutationFn: (connector, draft) => connector.saveWatchlistSettings(draft),
})

export function useSaveWatchlistSettings() {
  return useDomainMutation(saveWatchlistSettingsMutation)
}
