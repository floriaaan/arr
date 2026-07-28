import { type BaseServarrClient } from '../base-servarr-client.js'
import { classifyProvisioningError } from '../errors.js'
import { isoDate } from '../date-range.js'
import {
  RadarrMovieArraySchema,
  RadarrMovieSchema,
  RadarrMovieLookupArraySchema,
  RadarrCalendarMovieArraySchema,
  RadarrQueueResponseSchema,
} from './radarr.schemas.js'
import {
  toMediaItem,
  toMediaDetail,
  toLibraryItem,
  toCalendarEntry,
  toQueueProgress,
} from './radarr.mapper.js'
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

export class RadarrAdapter implements ServarrKindAdapter {
  constructor(
    private readonly client: BaseServarrClient,
    private readonly instance: ServarrInstance,
  ) {}

  async search(term: string): Promise<MediaItem[]> {
    const raw = await this.client.request({ path: '/api/v3/movie/lookup', query: { term } })
    return RadarrMovieLookupArraySchema.parse(raw).map(toMediaItem)
  }

  async detail(externalId: ExternalId): Promise<MediaDetail> {
    // Radarr's SkyHookProxy search parses a "tmdb:<id>" term for direct id lookup
    // (same convention Overseerr relies on) — not in the OpenAPI spec itself,
    // moderate rather than fully-verified confidence.
    const raw = await this.client.request({
      path: '/api/v3/movie/lookup',
      query: { term: `tmdb:${externalId.value}` },
    })
    const [movie] = RadarrMovieLookupArraySchema.parse(raw)
    if (!movie) throw new Error(`Radarr lookup returned no result for tmdb:${externalId.value}`)
    return toMediaDetail(movie, this.instance.id)
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
        path: '/api/v3/movie',
        body: {
          tmdbId: Number(request.externalId.value),
          title: request.title,
          qualityProfileId: this.instance.qualityProfileId.value,
          rootFolderPath: this.instance.rootFolderPath.value,
          monitored: true,
          addOptions: { searchForMovie: true },
        },
      })
      const movie = RadarrMovieSchema.parse(raw)
      return Result.ok(ExternalRef.create(this.instance.id, String(movie.id)))
    } catch (error) {
      return Result.err(classifyProvisioningError(error))
    }
  }

  async fetchProgress(refs: ExternalRef[]): Promise<ProgressSnapshot[]> {
    const raw = await this.client.request({ path: '/api/v3/queue', query: { pageSize: '250' } })
    const queue = RadarrQueueResponseSchema.parse(raw)
    const recordsByMovieId = new Map(
      queue.records
        .filter((record) => record.movieId !== null && record.movieId !== undefined)
        .map((record) => [String(record.movieId), record]),
    )

    const snapshots: ProgressSnapshot[] = []
    for (const ref of refs) {
      const record = recordsByMovieId.get(ref.remoteId)
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

      // Not in the queue anymore — it either finished importing or was removed;
      // check the movie itself before deciding (never guess a failure here).
      const movieRaw = await this.client.request({ path: `/api/v3/movie/${ref.remoteId}` })
      const movie = RadarrMovieSchema.parse(movieRaw)
      if (movie.hasFile) {
        snapshots.push({ ref, status: 'available' })
      }
    }
    return snapshots
  }

  async list(): Promise<LibraryItem[]> {
    const raw = await this.client.request({ path: '/api/v3/movie' })
    return RadarrMovieArraySchema.parse(raw).map((movie) => toLibraryItem(movie, this.instance.id))
  }

  async calendar(start: Date, end: Date): Promise<CalendarEntry[]> {
    const raw = await this.client.request({
      path: '/api/v3/calendar',
      query: { start: isoDate(start), end: isoDate(end) },
    })
    return RadarrCalendarMovieArraySchema.parse(raw).map((movie) =>
      toCalendarEntry(movie, this.instance.id),
    )
  }
}
