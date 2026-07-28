import { type BaseServarrClient } from '../base-servarr-client.js'
import { classifyProvisioningError } from '../errors.js'
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
  toQueueProgress,
} from './lidarr.mapper.js'
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
   * Lidarr's own lookup accepts a raw MusicBrainz id as the term for a direct
   * lookup (same family of convention as Radarr's "tmdb:<id>", but Lidarr
   * doesn't need a scheme prefix since MBIDs are unambiguous UUIDs) —
   * moderate rather than fully-verified confidence.
   */
  private async lookupByForeignAlbumId(foreignAlbumId: string) {
    const raw = await this.client.request({
      path: '/api/v1/album/lookup',
      query: { term: foreignAlbumId },
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

  async fetchProgress(refs: ExternalRef[]): Promise<ProgressSnapshot[]> {
    const raw = await this.client.request({ path: '/api/v1/queue', query: { pageSize: '250' } })
    const queue = LidarrQueueResponseSchema.parse(raw)
    const recordsByAlbumId = new Map(
      queue.records
        .filter((record) => record.albumId !== null && record.albumId !== undefined)
        .map((record) => [String(record.albumId), record]),
    )

    const snapshots: ProgressSnapshot[] = []
    for (const ref of refs) {
      const record = recordsByAlbumId.get(ref.remoteId)
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

      const albumRaw = await this.client.request({ path: `/api/v1/album/${ref.remoteId}` })
      const album = LidarrAlbumSchema.parse(albumRaw)
      if ((album.statistics?.trackFileCount ?? 0) > 0) {
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
}
