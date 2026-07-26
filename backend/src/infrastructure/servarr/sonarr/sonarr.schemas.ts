import { z } from 'zod'

/**
 * Verified against Sonarr's openapi.json (develop branch) — see the Phase 3
 * research notes. `statistics.episodeFileCount` is a moderate-confidence
 * extrapolation (well-known Sonarr shape, not explicitly re-verified in that
 * research pass) — used only as a "did anything import" signal, never to
 * report a failure.
 */
export const SonarrImageSchema = z.object({
  coverType: z.string(),
  url: z.string().optional(),
  remoteUrl: z.string().optional(),
})

export const SonarrSeriesSchema = z.object({
  id: z.number(),
  tvdbId: z.number(),
  title: z.string().nullable().optional(),
  year: z.number().optional(),
  overview: z.string().nullable().optional(),
  images: z.array(SonarrImageSchema).optional(),
  qualityProfileId: z.number().optional(),
  rootFolderPath: z.string().nullable().optional(),
  monitored: z.boolean().optional(),
  genres: z.array(z.string()).optional(),
  network: z.string().optional(),
  status: z.string().optional(),
  statistics: z.object({ episodeFileCount: z.number().optional() }).optional(),
})

export const SonarrSeriesArraySchema = SonarrSeriesSchema.array()

export const SonarrQualityProfileArraySchema = z
  .object({ id: z.number(), name: z.string() })
  .array()
export const SonarrRootFolderArraySchema = z.object({ id: z.number(), path: z.string() }).array()

export const SonarrQueueRecordSchema = z.object({
  id: z.number(),
  seriesId: z.number().nullable().optional(),
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

export const SonarrQueueResponseSchema = z.object({
  records: z.array(SonarrQueueRecordSchema),
})

export type SonarrSeries = z.infer<typeof SonarrSeriesSchema>
export type SonarrQueueRecord = z.infer<typeof SonarrQueueRecordSchema>
