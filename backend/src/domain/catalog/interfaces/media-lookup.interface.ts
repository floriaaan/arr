import type { MediaKind } from '../media-kind.vo.js'
import type { ExternalId } from '../external-id.vo.js'
import type { MediaItem } from '../media-item.entity.js'
import type { MediaDetail } from '../media-detail.entity.js'

export interface MediaLookup {
  search(kind: MediaKind, term: string): Promise<MediaItem[]>
  detail(id: ExternalId): Promise<MediaDetail>
}
