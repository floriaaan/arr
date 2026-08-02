import { Clapperboard, Tv, Music } from 'lucide-react'
import type { ServarrKind } from '#domain/settings/servarr-instance'

export const SERVARR_LABEL: Record<ServarrKind, string> = {
  radarr: 'Radarr',
  sonarr: 'Sonarr',
  lidarr: 'Lidarr',
}

export const SERVARR_META: Record<
  ServarrKind,
  { label: string; description: string; icon: typeof Clapperboard }
> = {
  radarr: { label: 'Radarr', description: 'Movies', icon: Clapperboard },
  sonarr: { label: 'Sonarr', description: 'TV shows', icon: Tv },
  lidarr: { label: 'Lidarr', description: 'Music', icon: Music },
}
