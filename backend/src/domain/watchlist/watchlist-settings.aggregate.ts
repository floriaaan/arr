import { AggregateRoot } from '#domain/shared/aggregate-root'

export interface WatchlistSettingsProps {
  enabled: boolean
  intervalMinutes: number
  maxNewRequestsPerRun: number
}

/**
 * Single-row settings, same shape as `NotificationSettings`. Unlike
 * `requests:reconcile`/`instances:health`, the interval is user-facing here
 * (cf. docs/phase-7-watchlist-sync, chantier 5 décision 2) — it trades off
 * watchlist freshness against load on Plex.tv/Jellyfin/Emby.
 */
export class WatchlistSettings extends AggregateRoot<string> {
  private props: WatchlistSettingsProps

  private constructor(id: string, props: WatchlistSettingsProps) {
    super(id)
    this.props = props
  }

  static create(id: string): WatchlistSettings {
    return new WatchlistSettings(id, {
      enabled: true,
      intervalMinutes: 60,
      maxNewRequestsPerRun: 20,
    })
  }

  static reconstruct(id: string, props: WatchlistSettingsProps): WatchlistSettings {
    return new WatchlistSettings(id, props)
  }

  get enabled(): boolean {
    return this.props.enabled
  }

  get intervalMinutes(): number {
    return this.props.intervalMinutes
  }

  get maxNewRequestsPerRun(): number {
    return this.props.maxNewRequestsPerRun
  }

  configure(props: WatchlistSettingsProps): void {
    this.props = props
  }
}
