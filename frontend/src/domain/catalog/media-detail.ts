import type { MediaItem } from './media-item'

export interface ManagedByInfo {
  instanceId: string
  rootFolderPath: string
  qualityProfileId: number
}

export interface MediaDetail extends MediaItem {
  genres: string[]
  runtimeMinutes?: number
  network?: string
  status?: string
  managedBy?: ManagedByInfo
}
