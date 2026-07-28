import { z } from 'zod'

/**
 * Verified against Radarr's openapi.json (develop branch) — see the Phase 3
 * research notes. Deliberately lenient (extra fields are ignored by Zod by
 * default): we only declare what we actually read.
 */
export const RadarrImageSchema = z.object({
  coverType: z.string(),
  url: z.string().optional(),
  remoteUrl: z.string().optional(),
})

export const RadarrMovieSchema = z.object({
  id: z.number(),
  tmdbId: z.number(),
  title: z.string().nullable().optional(),
  year: z.number().optional(),
  overview: z.string().nullable().optional(),
  images: z.array(RadarrImageSchema).optional(),
  hasFile: z.boolean().nullable().optional(),
  sizeOnDisk: z.number().optional(),
  qualityProfileId: z.number().optional(),
  rootFolderPath: z.string().nullable().optional(),
  monitored: z.boolean().optional(),
  genres: z.array(z.string()).optional(),
  runtime: z.number().optional(),
  status: z.string().optional(),
})

export const RadarrMovieArraySchema = RadarrMovieSchema.array()

/**
 * `GET /api/v3/movie/lookup` — unlike movies actually in the library, a
 * lookup hit for something not yet added has no Radarr-internal `id` at all
 * (the field is entirely absent from the response, not `0`).
 */
export const RadarrMovieLookupSchema = RadarrMovieSchema.extend({ id: z.number().optional() })
export const RadarrMovieLookupArraySchema = RadarrMovieLookupSchema.array()
export type RadarrMovieLookup = z.infer<typeof RadarrMovieLookupSchema>

/** `GET /api/v3/calendar` — a movie plus its release-date fields. */
export const RadarrCalendarMovieSchema = RadarrMovieSchema.extend({
  physicalRelease: z.string().nullable().optional(),
  digitalRelease: z.string().nullable().optional(),
  inCinemas: z.string().nullable().optional(),
})

export const RadarrCalendarMovieArraySchema = RadarrCalendarMovieSchema.array()
export type RadarrCalendarMovie = z.infer<typeof RadarrCalendarMovieSchema>

export const RadarrQualityProfileArraySchema = z
  .object({ id: z.number(), name: z.string() })
  .array()
export const RadarrRootFolderArraySchema = z.object({ id: z.number(), path: z.string() }).array()

export const RadarrQueueRecordSchema = z.object({
  id: z.number(),
  movieId: z.number().nullable().optional(),
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

export const RadarrQueueResponseSchema = z.object({
  records: z.array(RadarrQueueRecordSchema),
})

export type RadarrMovie = z.infer<typeof RadarrMovieSchema>
export type RadarrQueueRecord = z.infer<typeof RadarrQueueRecordSchema>
