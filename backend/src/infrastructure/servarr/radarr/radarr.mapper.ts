import type { RadarrMovie, RadarrCalendarMovie, RadarrQueueRecord } from './radarr.schemas.js'
import { ExternalId } from '#domain/catalog/external-id.vo'
import { PosterRef } from '#domain/catalog/poster-ref.vo'
import { MediaItem } from '#domain/catalog/media-item.entity'
import { MediaDetail } from '#domain/catalog/media-detail.entity'
import { LibraryItem } from '#domain/catalog/library-item.entity'
import { CalendarEntry } from '#domain/catalog/calendar-entry.entity'
import { RequestProgress } from '#domain/requests/request-progress.vo'
import type { RequestStatus } from '#domain/requests/request-status.vo'

function posterRefFrom(movie: RadarrMovie): PosterRef | null {
  const poster = movie.images?.find((image) => image.coverType === 'poster')
  const url = poster?.remoteUrl ?? poster?.url
  return url ? PosterRef.create(url) : null
}

function externalIdFor(movie: RadarrMovie): ExternalId {
  const result = ExternalId.create('tmdb', String(movie.tmdbId))
  if (!result.ok) throw new Error(`Radarr returned an invalid tmdbId: ${movie.tmdbId}`)
  return result.value
}

export function toMediaItem(movie: RadarrMovie): MediaItem {
  return MediaItem.create(externalIdFor(movie), {
    kind: 'movie',
    title: movie.title ?? 'Unknown title',
    year: movie.year ?? null,
    overview: movie.overview ?? '',
    posterRef: posterRefFrom(movie),
    alreadyManaged: movie.id > 0,
  })
}

export function toMediaDetail(movie: RadarrMovie, instanceId: string): MediaDetail {
  return MediaDetail.create(externalIdFor(movie), {
    kind: 'movie',
    title: movie.title ?? 'Unknown title',
    year: movie.year ?? null,
    overview: movie.overview ?? '',
    posterRef: posterRefFrom(movie),
    alreadyManaged: movie.id > 0,
    genres: movie.genres ?? [],
    runtimeMinutes: movie.runtime,
    status: movie.status,
    managedBy:
      movie.id > 0 && movie.rootFolderPath && movie.qualityProfileId
        ? {
            instanceId,
            rootFolderPath: movie.rootFolderPath,
            qualityProfileId: movie.qualityProfileId,
          }
        : undefined,
  })
}

export function toLibraryItem(movie: RadarrMovie, instanceId: string): LibraryItem {
  return LibraryItem.create(externalIdFor(movie), {
    kind: 'movie',
    title: movie.title ?? 'Unknown title',
    year: movie.year ?? null,
    posterRef: posterRefFrom(movie),
    monitored: movie.monitored ?? false,
    hasFile: movie.hasFile ?? false,
    sizeOnDiskBytes: movie.sizeOnDisk ?? 0,
    status: movie.status ?? 'unknown',
    instanceId,
  })
}

function calendarReleaseDate(movie: RadarrCalendarMovie): string {
  const date = movie.digitalRelease ?? movie.physicalRelease ?? movie.inCinemas
  return date ? date.slice(0, 10) : new Date().toISOString().slice(0, 10)
}

export function toCalendarEntry(movie: RadarrCalendarMovie, instanceId: string): CalendarEntry {
  return CalendarEntry.create(`radarr:${instanceId}:${movie.id}`, {
    kind: 'movie',
    title: movie.title ?? 'Unknown title',
    subtitle: null,
    releaseDate: calendarReleaseDate(movie),
    posterRef: posterRefFrom(movie),
    monitored: movie.monitored ?? false,
    hasFile: movie.hasFile ?? false,
    instanceId,
  })
}

const TRACKED_DOWNLOAD_STATE_TO_STATUS: Record<string, RequestStatus | undefined> = {
  downloading: 'downloading',
  importPending: 'importing',
  importBlocked: 'importing',
  importing: 'importing',
  imported: 'available',
  failedPending: 'failed',
  failed: 'failed',
}

export interface RadarrQueueProgress {
  status: RequestStatus | null
  progress: RequestProgress | null
  failureReason: string | null
}

export function toQueueProgress(record: RadarrQueueRecord): RadarrQueueProgress {
  const mappedStatus = record.trackedDownloadState
    ? TRACKED_DOWNLOAD_STATE_TO_STATUS[record.trackedDownloadState]
    : undefined
  const status =
    mappedStatus ??
    (record.status === 'failed' ? 'failed' : record.status === 'downloading' ? 'downloading' : null)

  const size = record.size ?? 0
  const sizeLeft = record.sizeleft ?? 0
  const percentage = size > 0 ? Math.min(100, Math.round(((size - sizeLeft) / size) * 100)) : 0

  const progressResult = RequestProgress.create({
    percentage,
    sizeLeftBytes: sizeLeft,
    eta: record.estimatedCompletionTime ? new Date(record.estimatedCompletionTime) : null,
    stepLabel: record.trackedDownloadState ?? record.status,
  })

  const failureReason =
    status === 'failed'
      ? (record.errorMessage ??
        record.statusMessages?.flatMap((m) => m.messages ?? []).join('; ') ??
        'Download failed')
      : null

  return {
    status,
    progress: progressResult.ok ? progressResult.value : null,
    failureReason,
  }
}
