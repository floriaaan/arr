import type { MediaServer } from '../media-server.aggregate.js'
import type { MediaServerKind } from '../media-server-kind.vo.js'

export interface MediaServerRepository {
  findAll(): Promise<MediaServer[]>
  findByKind(kind: MediaServerKind): Promise<MediaServer | null>
  save(server: MediaServer): Promise<void>
  delete(id: string): Promise<void>
}
