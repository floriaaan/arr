import { type BaseServarrClient } from '../base-servarr-client.js'
import { classifyProvisioningError } from '../errors.js'
import {
  SonarrSeriesArraySchema,
  SonarrSeriesSchema,
  SonarrQueueResponseSchema,
} from './sonarr.schemas.js'
import { toMediaItem, toMediaDetail, toQueueProgress } from './sonarr.mapper.js'
import type { ServarrKindAdapter } from '../servarr-kind-adapter.interface.js'
import type { ServarrInstance } from '#domain/settings/servarr-instance.aggregate'
import type { MediaItem } from '#domain/catalog/media-item.entity'
import type { MediaDetail } from '#domain/catalog/media-detail.entity'
import type { ExternalId } from '#domain/catalog/external-id.vo'
import type { MediaRequest } from '#domain/requests/media-request.aggregate'
import { ExternalRef } from '#domain/requests/external-ref.vo'
import type { ProvisioningError } from '#domain/requests/provisioning-error.vo'
import { Result } from '#domain/shared/result'
import type { ProgressSnapshot } from '#domain/requests/interfaces/download-progress.interface'

export class SonarrAdapter implements ServarrKindAdapter {
  constructor(
    private readonly client: BaseServarrClient,
    private readonly instance: ServarrInstance,
  ) {}

  async search(term: string): Promise<MediaItem[]> {
    const raw = await this.client.request({ path: '/api/v3/series/lookup', query: { term } })
    return SonarrSeriesArraySchema.parse(raw).map(toMediaItem)
  }

  async detail(externalId: ExternalId): Promise<MediaDetail> {
    // Same "tvdb:<id>" direct-lookup convention as Radarr's "tmdb:<id>".
    const raw = await this.client.request({
      path: '/api/v3/series/lookup',
      query: { term: `tvdb:${externalId.value}` },
    })
    const [series] = SonarrSeriesArraySchema.parse(raw)
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
          addOptions: { searchForMissingEpisodes: true },
        },
      })
      const series = SonarrSeriesSchema.parse(raw)
      return Result.ok(ExternalRef.create(this.instance.id, String(series.id)))
    } catch (error) {
      return Result.err(classifyProvisioningError(error))
    }
  }

  async fetchProgress(refs: ExternalRef[]): Promise<ProgressSnapshot[]> {
    const raw = await this.client.request({ path: '/api/v3/queue', query: { pageSize: '250' } })
    const queue = SonarrQueueResponseSchema.parse(raw)
    const recordsBySeriesId = new Map(
      queue.records
        .filter((record) => record.seriesId !== null && record.seriesId !== undefined)
        .map((record) => [String(record.seriesId), record]),
    )

    const snapshots: ProgressSnapshot[] = []
    for (const ref of refs) {
      const record = recordsBySeriesId.get(ref.remoteId)
      if (record) {
        const { status, progress, failureReason } = toQueueProgress(record)
        if (status) {
          snapshots.push({
            ref,
            status,
            progress: progress ?? undefined,
            failureReason: failureReason ?? undefined,
          })
        }
        continue
      }

      // Not in the queue — approximate "series has at least one imported
      // episode" as available. Full per-episode completion isn't tracked
      // at request granularity in the MVP.
      const seriesRaw = await this.client.request({ path: `/api/v3/series/${ref.remoteId}` })
      const series = SonarrSeriesSchema.parse(seriesRaw)
      if ((series.statistics?.episodeFileCount ?? 0) > 0) {
        snapshots.push({ ref, status: 'available' })
      }
    }
    return snapshots
  }
}
