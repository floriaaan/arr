import { Cast, MonitorPlay, Clapperboard } from 'lucide-react'
import type { MediaServerKind } from '#domain/settings/media-server'

/** Mirror of `SERVARR_META` in `settings-panels.tsx`, for the media servers. */
export const MEDIA_SERVER_META: Record<
  MediaServerKind,
  { label: string; description: string; placeholder: string; icon: typeof Cast }
> = {
  plex: {
    label: 'Plex',
    description: 'Plex Media Server',
    placeholder: 'http://localhost:32400',
    icon: Cast,
  },
  jellyfin: {
    label: 'Jellyfin',
    description: 'Jellyfin server',
    placeholder: 'http://localhost:8096',
    icon: MonitorPlay,
  },
  emby: {
    label: 'Emby',
    description: 'Emby server',
    placeholder: 'http://localhost:8096',
    icon: Clapperboard,
  },
}
