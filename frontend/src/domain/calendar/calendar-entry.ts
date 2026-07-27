export type CalendarEntryKind = 'movie' | 'episode' | 'album'

export interface CalendarEntry {
  id: string
  kind: CalendarEntryKind
  title: string
  subtitle: string | null
  releaseDate: string
  posterUrl: string | null
  monitored: boolean
  hasFile: boolean
  instanceId: string
}
