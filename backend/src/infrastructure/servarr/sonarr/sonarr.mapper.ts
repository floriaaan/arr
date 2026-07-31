import type { SonarrSeries, SonarrSeriesLookup, SonarrCalendarEpisode } from './sonarr.schemas.js'
import { ExternalId } from '#domain/catalog/external-id.vo'
import { PosterRef } from '#domain/catalog/poster-ref.vo'
import { MediaItem } from '#domain/catalog/media-item.entity'
import { MediaDetail } from '#domain/catalog/media-detail.entity'
import { LibraryItem } from '#domain/catalog/library-item.entity'
import { CalendarEntry } from '#domain/catalog/calendar-entry.entity'

function posterRefFrom(series: SonarrSeriesLookup): PosterRef | null {
  const poster = series.images?.find((image) => image.coverType === 'poster')
  const url = poster?.remoteUrl ?? poster?.url
  return url ? PosterRef.create(url) : null
}

function externalIdFor(series: SonarrSeriesLookup): ExternalId {
  const result = ExternalId.create('tvdb', String(series.tvdbId))
  if (!result.ok) throw new Error(`Sonarr returned an invalid tvdbId: ${series.tvdbId}`)
  return result.value
}

export function toMediaItem(series: SonarrSeriesLookup): MediaItem {
  return MediaItem.create(externalIdFor(series), {
    kind: 'series',
    title: series.title ?? 'Unknown title',
    year: series.year ?? null,
    overview: series.overview ?? '',
    posterRef: posterRefFrom(series),
    alreadyManaged: (series.id ?? 0) > 0,
  })
}

export function toMediaDetail(series: SonarrSeriesLookup, instanceId: string): MediaDetail {
  return MediaDetail.create(externalIdFor(series), {
    kind: 'series',
    title: series.title ?? 'Unknown title',
    year: series.year ?? null,
    overview: series.overview ?? '',
    posterRef: posterRefFrom(series),
    alreadyManaged: (series.id ?? 0) > 0,
    genres: series.genres ?? [],
    network: series.network,
    status: series.status,
    managedBy:
      (series.id ?? 0) > 0 && series.rootFolderPath && series.qualityProfileId
        ? {
            instanceId,
            rootFolderPath: series.rootFolderPath,
            qualityProfileId: series.qualityProfileId,
          }
        : undefined,
  })
}

export function toLibraryItem(series: SonarrSeries, instanceId: string): LibraryItem {
  return LibraryItem.create(externalIdFor(series), {
    kind: 'series',
    title: series.title ?? 'Unknown title',
    year: series.year ?? null,
    posterRef: posterRefFrom(series),
    monitored: series.monitored ?? false,
    hasFile: (series.statistics?.episodeFileCount ?? 0) > 0,
    sizeOnDiskBytes: series.statistics?.sizeOnDisk ?? 0,
    status: series.status ?? 'unknown',
    instanceId,
  })
}

function episodeSubtitle(episode: SonarrCalendarEpisode): string {
  const season = (episode.seasonNumber ?? 0).toString().padStart(2, '0')
  const number = (episode.episodeNumber ?? 0).toString().padStart(2, '0')
  return `S${season}E${number}`
}

export function toCalendarEntry(episode: SonarrCalendarEpisode, instanceId: string): CalendarEntry {
  return CalendarEntry.create(`sonarr:${instanceId}:${episode.id}`, {
    kind: 'episode',
    title: episode.series?.title ?? episode.title ?? 'Unknown title',
    subtitle: episodeSubtitle(episode),
    releaseDate: episode.airDateUtc
      ? episode.airDateUtc.slice(0, 10)
      : new Date().toISOString().slice(0, 10),
    posterRef: episode.series ? posterRefFrom(episode.series) : null,
    monitored: episode.monitored ?? false,
    hasFile: episode.hasFile ?? false,
    instanceId,
    externalId: episode.series ? externalIdFor(episode.series) : null,
  })
}

/**
 * Queue mapping lives in `../queue-progress.ts` — the three *arr shared three
 * byte-identical copies of it, and the multi-record rule must exist once.
 */
export { toQueueProgress, aggregateQueueProgress } from '../queue-progress.js'
export type { QueueProgress } from '../queue-progress.js'
