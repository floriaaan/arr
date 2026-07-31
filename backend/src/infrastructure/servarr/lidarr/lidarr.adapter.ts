import { type BaseServarrClient } from '../base-servarr-client.js'
import { classifyProvisioningError, classifyConnectionError } from '../errors.js'
import { removeFromQueue, unmonitorItem } from '../cancel-provisioning.js'
import { isoDate } from '../date-range.js'
import {
  LidarrAlbumArraySchema,
  LidarrAlbumSchema,
  LidarrAlbumLookupArraySchema,
  LidarrQueueResponseSchema,
} from './lidarr.schemas.js'
import {
  toMediaItem,
  toMediaDetail,
  toLibraryItem,
  toCalendarEntry,
  aggregateQueueProgress,
} from './lidarr.mapper.js'
import type { LidarrQueueRecord } from './lidarr.schemas.js'
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

export class LidarrAdapter implements ServarrKindAdapter {
  constructor(
    private readonly client: BaseServarrClient,
    private readonly instance: ServarrInstance,
  ) {}

  async search(term: string): Promise<MediaItem[]> {
    const raw = await this.client.request({ path: '/api/v1/album/lookup', query: { term } })
    return LidarrAlbumLookupArraySchema.parse(raw).map(toMediaItem)
  }

  async detail(externalId: ExternalId): Promise<MediaDetail> {
    const album = await this.lookupByForeignAlbumId(externalId.value)
    return toMediaDetail(album, this.instance.id)
  }

  /**
   * Lidarr needs the "lidarr:<mbid>" scheme prefix for a direct id lookup —
   * same convention family as Radarr's "tmdb:<id>". A bare MBID falls back
   * to MusicBrainz text search and can miss the exact album.
   */
  private async lookupByForeignAlbumId(foreignAlbumId: string) {
    const raw = await this.client.request({
      path: '/api/v1/album/lookup',
      query: { term: `lidarr:${foreignAlbumId}` },
    })
    const [album] = LidarrAlbumLookupArraySchema.parse(raw)
    if (!album) throw new Error(`Lidarr lookup returned no result for ${foreignAlbumId}`)
    return album
  }

  async submit(request: MediaRequest): Promise<Result<ExternalRef, ProvisioningError>> {
    if (
      !this.instance.rootFolderPath ||
      !this.instance.qualityProfileId ||
      !this.instance.metadataProfileId
    ) {
      return Result.err({
        type: 'validation_failed',
        message: 'Instance is missing a root folder, quality profile or metadata profile',
      })
    }

    try {
      const lookedUp = await this.lookupByForeignAlbumId(request.externalId.value)
      if (!lookedUp.artist) {
        return Result.err({
          type: 'unknown',
          message: 'Lidarr lookup did not return an artist for this album',
        })
      }

      // A single POST /api/v1/album with a nested artist object both creates
      // the artist (if it doesn't exist yet) and the album — confirmed via
      // AddAlbumService.AddAlbum, cf. schema file comment.
      const raw = await this.client.request({
        method: 'POST',
        path: '/api/v1/album',
        body: {
          foreignAlbumId: request.externalId.value,
          monitored: true,
          addOptions: { searchForNewAlbum: true },
          artist: {
            foreignArtistId: lookedUp.artist.foreignArtistId,
            qualityProfileId: this.instance.qualityProfileId.value,
            metadataProfileId: this.instance.metadataProfileId.value,
            rootFolderPath: this.instance.rootFolderPath.value,
            monitored: true,
            addOptions: { monitor: 'none', searchForMissingAlbums: false },
          },
        },
      })
      const album = LidarrAlbumSchema.parse(raw)
      return Result.ok(ExternalRef.create(this.instance.id, String(album.id)))
    } catch (error) {
      return Result.err(classifyProvisioningError(error))
    }
  }

  async cancel(request: MediaRequest): Promise<Result<void, ProvisioningError>> {
    const remoteId = request.externalRef?.remoteId
    if (!remoteId) return Result.ok(undefined)

    try {
      const raw = await this.client.request({ path: '/api/v1/queue', query: { pageSize: '250' } })
      const queue = LidarrQueueResponseSchema.parse(raw)
      await removeFromQueue(
        this.client,
        '/api/v1',
        queue.records.filter((r) => String(r.albumId) === remoteId).map((r) => r.id),
      )

      const albumRaw = await this.client.request({ path: `/api/v1/album/${remoteId}` })
      await unmonitorItem(
        this.client,
        `/api/v1/album/${remoteId}`,
        albumRaw as Record<string, unknown>,
      )
      return Result.ok(undefined)
    } catch (error) {
      return Result.err(classifyProvisioningError(error))
    }
  }

  async fetchProgress(refs: ExternalRef[]): Promise<ProgressSnapshot[]> {
    const raw = await this.client.request({ path: '/api/v1/queue', query: { pageSize: '250' } })
    const queue = LidarrQueueResponseSchema.parse(raw)
    // One queue record per *track*, same shape as Sonarr's per-episode records
    // (cf. docs/phase-6-fiabilite-requests, chantier 4).
    const recordsByAlbumId = new Map<string, LidarrQueueRecord[]>()
    for (const record of queue.records) {
      if (record.albumId === null || record.albumId === undefined) continue
      const key = String(record.albumId)
      const existing = recordsByAlbumId.get(key)
      if (existing) existing.push(record)
      else recordsByAlbumId.set(key, [record])
    }

    const snapshots: ProgressSnapshot[] = []
    for (const ref of refs) {
      const { status, progress, failureReason } = aggregateQueueProgress(
        recordsByAlbumId.get(ref.remoteId) ?? [],
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

      // An album is available only when every one of its tracks has a file.
      const albumRaw = await this.client.request({ path: `/api/v1/album/${ref.remoteId}` })
      const album = LidarrAlbumSchema.parse(albumRaw)
      const trackCount = album.statistics?.trackCount ?? 0
      const trackFileCount = album.statistics?.trackFileCount ?? 0
      if (trackCount > 0 && trackFileCount >= trackCount) {
        snapshots.push({ ref, status: 'available' })
      }
    }
    return snapshots
  }

  /**
   * `GET /api/v1/album` without `artistId` returns every album across all
   * artists on the instance — moderate rather than fully-verified
   * confidence, same caveat class as the lookup-term convention above.
   */
  async list(): Promise<LibraryItem[]> {
    const raw = await this.client.request({ path: '/api/v1/album' })
    return LidarrAlbumArraySchema.parse(raw).map((album) => toLibraryItem(album, this.instance.id))
  }

  async calendar(start: Date, end: Date): Promise<CalendarEntry[]> {
    const raw = await this.client.request({
      path: '/api/v1/calendar',
      query: { start: isoDate(start), end: isoDate(end) },
    })
    return LidarrAlbumArraySchema.parse(raw).map((album) =>
      toCalendarEntry(album, this.instance.id),
    )
  }

  async remove(
    externalId: ExternalId,
    deleteFiles: boolean,
  ): Promise<Result<void, ConnectionError>> {
    try {
      const album = await this.lookupByForeignAlbumId(externalId.value)
      if (!album.id) {
        return Result.err({ type: 'unexpected_response', message: 'Album not found on Lidarr' })
      }

      await this.client.request({
        method: 'DELETE',
        path: `/api/v1/album/${album.id}`,
        query: { deleteFiles: String(deleteFiles) },
      })
      return Result.ok(undefined)
    } catch (error) {
      return Result.err(classifyConnectionError(error))
    }
  }
}
