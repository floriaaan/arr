export type ServarrKind = 'radarr' | 'sonarr' | 'lidarr'

export const ServarrKinds = {
  Radarr: 'radarr',
  Sonarr: 'sonarr',
  Lidarr: 'lidarr',
} as const satisfies Record<string, ServarrKind>
