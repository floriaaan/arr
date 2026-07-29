import type { ServarrKind } from '#domain/settings/servarr-instance'

export const SERVARR_LABEL: Record<ServarrKind, string> = {
  radarr: 'Radarr',
  sonarr: 'Sonarr',
  lidarr: 'Lidarr',
}
