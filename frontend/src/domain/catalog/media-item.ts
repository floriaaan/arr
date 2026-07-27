import type { MediaKind } from './media-kind'
import type { ExternalId } from './external-id'

export interface MediaItem {
  externalId: ExternalId
  kind: MediaKind
  title: string
  year: number | null
  overview: string
  posterUrl: string | null
  alreadyManaged: boolean
}
