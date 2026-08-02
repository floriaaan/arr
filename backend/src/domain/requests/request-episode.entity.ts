/**
 * A read model, not an aggregate: the per-episode view of a requested series,
 * fetched on demand when the user unfolds a request (cf.
 * docs/phase-6-fiabilite-requests, chantier 5). Nothing here is persisted —
 * the *arr instance remains the source of truth.
 */
export type RequestEpisodeState = 'available' | 'downloading' | 'importing' | 'missing' | 'failed'

export interface RequestEpisode {
  seasonNumber: number
  episodeNumber: number
  title: string
  airDate: string | null
  state: RequestEpisodeState
  /** Only set while the episode is actually moving; `null` otherwise. */
  percentage: number | null
}
