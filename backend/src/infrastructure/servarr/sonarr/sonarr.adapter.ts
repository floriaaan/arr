import { type BaseServarrClient } from '../base-servarr-client.js'
import { classifyProvisioningError, classifyConnectionError } from '../errors.js'
import { removeFromQueue, unmonitorItem } from '../cancel-provisioning.js'
import { isoDate } from '../date-range.js'
import {
  SonarrSeriesArraySchema,
  SonarrSeriesSchema,
  SonarrSeriesLookupArraySchema,
  SonarrCalendarEpisodeArraySchema,
  SonarrQueueResponseSchema,
} from './sonarr.schemas.js'
import {
  toMediaItem,
  toMediaDetail,
  toLibraryItem,
  toCalendarEntry,
  aggregateQueueProgress,
} from './sonarr.mapper.js'
import type { SonarrQueueRecord } from './sonarr.schemas.js'
import type { ServarrKindAdapter } from '../servarr-kind-adapter.interface.js'
import type { ServarrInstance } from '#domain/settings/servarr-instance.aggregate'
import type { MediaItem } from '#domain/catalog/media-item.entity'
import type { MediaDetail } from '#domain/catalog/media-detail.entity'
import type { LibraryItem } from '#domain/catalog/library-item.entity'
import type { CalendarEntry } from '#domain/catalog/calendar-entry.entity'
import type { ExternalId } from '#domain/catalog/external-id.vo'
import type { MediaRequest } from '#domain/requests/media-request.aggregate'
import { ExternalRef } from '#domain/requests/external-ref.vo'
import type { ProvisioningError } from '#domain/requests/provisioning-error.vo'
import { Result } from '#domain/shared/result'
import type { ProgressSnapshot } from '#domain/requests/interfaces/download-progress.interface'
import type { ConnectionError } from '#domain/settings/connection-error.vo'

export class SonarrAdapter implements ServarrKindAdapter {
  constructor(
    private readonly client: BaseServarrClient,
    private readonly instance: ServarrInstance,
  ) {}

  async search(term: string): Promise<MediaItem[]> {
    const raw = await this.client.request({ path: '/api/v3/series/lookup', query: { term } })
    return SonarrSeriesLookupArraySchema.parse(raw).map(toMediaItem)
  }

  async detail(externalId: ExternalId): Promise<MediaDetail> {
    // Same "tvdb:<id>" direct-lookup convention as Radarr's "tmdb:<id>".
    const raw = await this.client.request({
      path: '/api/v3/series/lookup',
      query: { term: `tvdb:${externalId.value}` },
    })
    const [series] = SonarrSeriesLookupArraySchema.parse(raw)
    if (!series) throw new Error(`Sonarr lookup returned no result for tvdb:${externalId.value}`)
    return toMediaDetail(series, this.instance.id)
  }

  async submit(request: MediaRequest): Promise<Result<ExternalRef, ProvisioningError>> {
    if (!this.instance.rootFolderPath || !this.instance.qualityProfileId) {
      return Result.err({
        type: 'validation_failed',
        message: 'Instance is missing a root folder or quality profile',
      })
    }

    try {
      const raw = await this.client.request({
        method: 'POST',
        path: '/api/v3/series',
        body: {
          tvdbId: Number(request.externalId.value),
          title: request.title,
          qualityProfileId: this.instance.qualityProfileId.value,
          rootFolderPath: this.instance.rootFolderPath.value,
          monitored: true,
          seasonFolder: true,
          seriesType: this.instance.seriesType?.value ?? 'standard',
          addOptions: { searchForMissingEpisodes: true },
        },
      })
      const series = SonarrSeriesSchema.parse(raw)
      return Result.ok(ExternalRef.create(this.instance.id, String(series.id)))
    } catch (error) {
      return Result.err(classifyProvisioningError(error))
    }
  }

  async cancel(request: MediaRequest): Promise<Result<void, ProvisioningError>> {
    const remoteId = request.externalRef?.remoteId
    if (!remoteId) return Result.ok(undefined)

    try {
      const raw = await this.client.request({ path: '/api/v3/queue', query: { pageSize: '250' } })
      const queue = SonarrQueueResponseSchema.parse(raw)
      await removeFromQueue(
        this.client,
        '/api/v3',
        queue.records.filter((r) => String(r.seriesId) === remoteId).map((r) => r.id),
      )

      const seriesRaw = await this.client.request({ path: `/api/v3/series/${remoteId}` })
      await unmonitorItem(
        this.client,
        `/api/v3/series/${remoteId}`,
        seriesRaw as Record<string, unknown>,
      )
      return Result.ok(undefined)
    } catch (error) {
      return Result.err(classifyProvisioningError(error))
    }
  }

  async fetchProgress(refs: ExternalRef[]): Promise<ProgressSnapshot[]> {
    const raw = await this.client.request({ path: '/api/v3/queue', query: { pageSize: '250' } })
    const queue = SonarrQueueResponseSchema.parse(raw)
    // A series has one queue record *per episode*: grouping into a plain Map
    // kept only the last one, so the reported progress was an arbitrary
    // episode's (cf. docs/phase-6-fiabilite-requests, chantier 4).
    const recordsBySeriesId = new Map<string, SonarrQueueRecord[]>()
    for (const record of queue.records) {
      if (record.seriesId === null || record.seriesId === undefined) continue
      const key = String(record.seriesId)
      const existing = recordsBySeriesId.get(key)
      if (existing) existing.push(record)
      else recordsBySeriesId.set(key, [record])
    }

    const snapshots: ProgressSnapshot[] = []
    for (const ref of refs) {
      const { status, progress, failureReason } = aggregateQueueProgress(
        recordsBySeriesId.get(ref.remoteId) ?? [],
      )
      if (status) {
        snapshots.push({
          ref,
          status,
          progress: progress ?? undefined,
          failureReason: failureReason ?? undefined,
        })
        continue
      }

      // The queue is inconclusive (nothing queued, or everything imported):
      // a series is available only when *every* aired episode has a file.
      const seriesRaw = await this.client.request({ path: `/api/v3/series/${ref.remoteId}` })
      const series = SonarrSeriesSchema.parse(seriesRaw)
      const episodeCount = series.statistics?.episodeCount ?? 0
      const episodeFileCount = series.statistics?.episodeFileCount ?? 0
      if (episodeCount > 0 && episodeFileCount >= episodeCount) {
        snapshots.push({ ref, status: 'available' })
      }
    }
    return snapshots
  }

  async list(): Promise<LibraryItem[]> {
    const raw = await this.client.request({ path: '/api/v3/series' })
    return SonarrSeriesArraySchema.parse(raw).map((series) =>
      toLibraryItem(series, this.instance.id),
    )
  }

  async calendar(start: Date, end: Date): Promise<CalendarEntry[]> {
    const raw = await this.client.request({
      path: '/api/v3/calendar',
      query: { start: isoDate(start), end: isoDate(end), includeSeries: 'true' },
    })
    return SonarrCalendarEpisodeArraySchema.parse(raw).map((episode) =>
      toCalendarEntry(episode, this.instance.id),
    )
  }

  async remove(
    externalId: ExternalId,
    deleteFiles: boolean,
  ): Promise<Result<void, ConnectionError>> {
    try {
      const raw = await this.client.request({
        path: '/api/v3/series/lookup',
        query: { term: `tvdb:${externalId.value}` },
      })
      const [series] = SonarrSeriesLookupArraySchema.parse(raw)
      if (!series || !series.id) {
        return Result.err({ type: 'unexpected_response', message: 'Series not found on Sonarr' })
      }

      await this.client.request({
        method: 'DELETE',
        path: `/api/v3/series/${series.id}`,
        query: { deleteFiles: String(deleteFiles) },
      })
      return Result.ok(undefined)
    } catch (error) {
      return Result.err(classifyConnectionError(error))
    }
  }
}
