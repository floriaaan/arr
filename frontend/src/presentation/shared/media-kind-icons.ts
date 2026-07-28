import { Clapperboard, Music, Tv } from 'lucide-react'
import type { MediaKind } from '#domain/catalog/media-kind'

export const MEDIA_KIND_ICONS: Record<MediaKind, typeof Clapperboard> = {
  movie: Clapperboard,
  series: Tv,
  album: Music,
}
