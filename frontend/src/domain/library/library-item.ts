import type { MediaKind } from '../catalog/media-kind'
import type { ExternalId } from '../catalog/external-id'

export interface LibraryItem {
  externalId: ExternalId
  kind: MediaKind
  title: string
  year: number | null
  posterUrl: string | null
  monitored: boolean
  hasFile: boolean
  sizeOnDiskBytes: number
  status: string
  instanceId: string
}
