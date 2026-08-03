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
