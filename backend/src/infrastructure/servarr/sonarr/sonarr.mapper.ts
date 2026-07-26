import type { SonarrSeries, SonarrQueueRecord } from './sonarr.schemas.js'
import { ExternalId } from '#domain/catalog/external-id.vo'
import { PosterRef } from '#domain/catalog/poster-ref.vo'
import { MediaItem } from '#domain/catalog/media-item.entity'
import { MediaDetail } from '#domain/catalog/media-detail.entity'
import { RequestProgress } from '#domain/requests/request-progress.vo'
import type { RequestStatus } from '#domain/requests/request-status.vo'

function posterRefFrom(series: SonarrSeries): PosterRef | null {
  const poster = series.images?.find((image) => image.coverType === 'poster')
  const url = poster?.remoteUrl ?? poster?.url
  return url ? PosterRef.create(url) : null
}

function externalIdFor(series: SonarrSeries): ExternalId {
  const result = ExternalId.create('tvdb', String(series.tvdbId))
  if (!result.ok) throw new Error(`Sonarr returned an invalid tvdbId: ${series.tvdbId}`)
  return result.value
}

export function toMediaItem(series: SonarrSeries): MediaItem {
  return MediaItem.create(externalIdFor(series), {
    kind: 'series',
    title: series.title ?? 'Unknown title',
    year: series.year ?? null,
    overview: series.overview ?? '',
    posterRef: posterRefFrom(series),
    alreadyManaged: series.id > 0,
  })
}

export function toMediaDetail(series: SonarrSeries, instanceId: string): MediaDetail {
  return MediaDetail.create(externalIdFor(series), {
    kind: 'series',
    title: series.title ?? 'Unknown title',
    year: series.year ?? null,
    overview: series.overview ?? '',
    posterRef: posterRefFrom(series),
    alreadyManaged: series.id > 0,
    genres: series.genres ?? [],
    network: series.network,
    status: series.status,
    managedBy:
      series.id > 0 && series.rootFolderPath && series.qualityProfileId
        ? {
            instanceId,
            rootFolderPath: series.rootFolderPath,
            qualityProfileId: series.qualityProfileId,
          }
        : undefined,
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

export interface SonarrQueueProgress {
  status: RequestStatus | null
  progress: RequestProgress | null
  failureReason: string | null
}

export function toQueueProgress(record: SonarrQueueRecord): SonarrQueueProgress {
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
