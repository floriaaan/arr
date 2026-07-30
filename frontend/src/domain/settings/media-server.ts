export type MediaServerKind = 'plex' | 'jellyfin' | 'emby'

export const MEDIA_SERVER_KINDS: readonly MediaServerKind[] = ['plex', 'jellyfin', 'emby']

export interface MediaServerDto {
  id: string
  kind: MediaServerKind
  baseUrl: string
  enabled: boolean
}

export interface MediaServerDraft {
  baseUrl: string
  enabled: boolean
}
