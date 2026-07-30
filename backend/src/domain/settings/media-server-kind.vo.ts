export type MediaServerKind = 'plex' | 'jellyfin' | 'emby'

export const MediaServerKinds = {
  Plex: 'plex',
  Jellyfin: 'jellyfin',
  Emby: 'emby',
} as const satisfies Record<string, MediaServerKind>
