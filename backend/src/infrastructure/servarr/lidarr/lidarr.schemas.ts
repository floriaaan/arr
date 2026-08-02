import { z } from 'zod'

/**
 * Verified against Lidarr's openapi.json (develop branch) — see the Phase 3
 * research notes, including the confirmed single-call add flow: POST
 * /api/v1/album with a nested `artist` object creates the artist too if it
 * doesn't already exist (AddAlbumService.AddAlbum).
 */
export const LidarrImageSchema = z.object({
  coverType: z.string(),
  url: z.string().optional(),
  remoteUrl: z.string().optional(),
})

export const LidarrArtistSchema = z.object({
  id: z.number(),
  foreignArtistId: z.string(),
  artistName: z.string().nullable().optional(),
  overview: z.string().nullable().optional(),
  images: z.array(LidarrImageSchema).optional(),
  qualityProfileId: z.number().optional(),
  metadataProfileId: z.number().optional(),
  rootFolderPath: z.string().nullable().optional(),
  monitored: z.boolean().optional(),
})

export const LidarrAlbumSchema = z.object({
  id: z.number(),
  foreignAlbumId: z.string(),
  title: z.string().nullable().optional(),
  releaseDate: z.string().nullable().optional(),
  genres: z.array(z.string()).optional(),
  artist: LidarrArtistSchema.optional(),
  images: z.array(LidarrImageSchema).optional(),
  monitored: z.boolean().optional(),
  statistics: z
    .object({
      trackFileCount: z.number().optional(),
      trackCount: z.number().optional(),
      sizeOnDisk: z.number().optional(),
    })
    .optional(),
})

export const LidarrAlbumArraySchema = LidarrAlbumSchema.array()

/**
 * `GET /api/v1/album/lookup` — a lookup hit for an album (and its nested
 * artist) not yet added has no Lidarr-internal `id` at all (cf. Radarr's
 * equivalent lookup schema) — `submit()` relies on this exact case to add a
 * brand-new album, so it can't require a real id either.
 */
export const LidarrArtistLookupSchema = LidarrArtistSchema.extend({ id: z.number().optional() })
export const LidarrAlbumLookupSchema = LidarrAlbumSchema.extend({
  id: z.number().optional(),
  artist: LidarrArtistLookupSchema.optional(),
})
export const LidarrAlbumLookupArraySchema = LidarrAlbumLookupSchema.array()
export type LidarrAlbumLookup = z.infer<typeof LidarrAlbumLookupSchema>

export const LidarrMetadataProfileArraySchema = z
  .object({ id: z.number(), name: z.string() })
  .array()
export const LidarrQualityProfileArraySchema = z
  .object({ id: z.number(), name: z.string() })
  .array()
export const LidarrRootFolderArraySchema = z.object({ id: z.number(), path: z.string() }).array()

export const LidarrQueueRecordSchema = z.object({
  id: z.number(),
  artistId: z.number().nullable().optional(),
  albumId: z.number().nullable().optional(),
  title: z.string().nullable().optional(),
  size: z.number().optional(),
  sizeleft: z.number().optional(),
  status: z.string(),
  trackedDownloadStatus: z.string().optional(),
  trackedDownloadState: z.string().optional(),
  errorMessage: z.string().nullable().optional(),
  statusMessages: z
    .array(z.object({ title: z.string().optional(), messages: z.array(z.string()).optional() }))
    .optional(),
  estimatedCompletionTime: z.string().nullable().optional(),
})

export const LidarrQueueResponseSchema = z.object({
  records: z.array(LidarrQueueRecordSchema),
})

export type LidarrAlbum = z.infer<typeof LidarrAlbumSchema>
export type LidarrQueueRecord = z.infer<typeof LidarrQueueRecordSchema>
