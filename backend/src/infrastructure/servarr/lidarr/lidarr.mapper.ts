import type { LidarrAlbum, LidarrAlbumLookup } from './lidarr.schemas.js'
import { ExternalId } from '#domain/catalog/external-id.vo'
import { PosterRef } from '#domain/catalog/poster-ref.vo'
import { MediaItem } from '#domain/catalog/media-item.entity'
import { MediaDetail } from '#domain/catalog/media-detail.entity'
import { LibraryItem } from '#domain/catalog/library-item.entity'
import { CalendarEntry } from '#domain/catalog/calendar-entry.entity'

function posterRefFrom(album: LidarrAlbumLookup): PosterRef | null {
  const images = album.images ?? album.artist?.images
  const poster = images?.find(
    (image) => image.coverType === 'cover' || image.coverType === 'poster',
  )
  const url = poster?.remoteUrl ?? poster?.url
  return url ? PosterRef.create(url) : null
}

function externalIdFor(album: LidarrAlbumLookup): ExternalId {
  const result = ExternalId.create('musicbrainz', album.foreignAlbumId)
  if (!result.ok)
    throw new Error(`Lidarr returned an invalid foreignAlbumId: ${album.foreignAlbumId}`)
  return result.value
}

export function toMediaItem(album: LidarrAlbumLookup): MediaItem {
  return MediaItem.create(externalIdFor(album), {
    kind: 'album',
    title: album.title ?? 'Unknown title',
    year: album.releaseDate ? new Date(album.releaseDate).getFullYear() : null,
    overview: album.artist?.overview ?? '',
    posterRef: posterRefFrom(album),
    alreadyManaged: (album.id ?? 0) > 0,
  })
}

export function toMediaDetail(album: LidarrAlbumLookup, instanceId: string): MediaDetail {
  return MediaDetail.create(externalIdFor(album), {
    kind: 'album',
    title: album.title ?? 'Unknown title',
    year: album.releaseDate ? new Date(album.releaseDate).getFullYear() : null,
    overview: album.artist?.overview ?? '',
    posterRef: posterRefFrom(album),
    alreadyManaged: (album.id ?? 0) > 0,
    genres: album.genres ?? [],
    managedBy:
      (album.id ?? 0) > 0 && album.artist?.rootFolderPath && album.artist.qualityProfileId
        ? {
            instanceId,
            rootFolderPath: album.artist.rootFolderPath,
            qualityProfileId: album.artist.qualityProfileId,
          }
        : undefined,
  })
}

export function toLibraryItem(album: LidarrAlbum, instanceId: string): LibraryItem {
  return LibraryItem.create(externalIdFor(album), {
    kind: 'album',
    title: album.title ?? 'Unknown title',
    year: album.releaseDate ? new Date(album.releaseDate).getFullYear() : null,
    posterRef: posterRefFrom(album),
    monitored: album.monitored ?? false,
    hasFile: (album.statistics?.trackFileCount ?? 0) > 0,
    sizeOnDiskBytes: album.statistics?.sizeOnDisk ?? 0,
    status: album.monitored ? 'monitored' : 'unmonitored',
    instanceId,
  })
}

export function toCalendarEntry(album: LidarrAlbum, instanceId: string): CalendarEntry {
  return CalendarEntry.create(`lidarr:${instanceId}:${album.id}`, {
    kind: 'album',
    title: album.title ?? 'Unknown title',
    subtitle: album.artist?.artistName ?? null,
    releaseDate: album.releaseDate
      ? album.releaseDate.slice(0, 10)
      : new Date().toISOString().slice(0, 10),
    posterRef: posterRefFrom(album),
    monitored: album.monitored ?? false,
    hasFile: (album.statistics?.trackFileCount ?? 0) > 0,
    instanceId,
    externalId: externalIdFor(album),
  })
}

/**
 * Queue mapping lives in `../queue-progress.ts` — the three *arr shared three
 * byte-identical copies of it, and the multi-record rule must exist once.
 */
export { toQueueProgress, aggregateQueueProgress } from '../queue-progress.js'
export type { QueueProgress } from '../queue-progress.js'
