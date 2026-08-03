import type { WatchlistSettings } from '#domain/watchlist/watchlist-settings.aggregate'

export interface WatchlistSettingsDto {
  enabled: boolean
  intervalMinutes: number
  maxNewRequestsPerRun: number
}

export function toWatchlistSettingsDto(settings: WatchlistSettings): WatchlistSettingsDto {
  return {
    enabled: settings.enabled,
    intervalMinutes: settings.intervalMinutes,
    maxNewRequestsPerRun: settings.maxNewRequestsPerRun,
  }
}
