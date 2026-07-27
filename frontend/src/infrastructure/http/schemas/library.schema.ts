import { z } from 'zod'

const externalIdSchema = z.object({
  scheme: z.enum(['tmdb', 'tvdb', 'musicbrainz']),
  value: z.string(),
})

export const libraryItemDtoSchema = z.object({
  externalId: externalIdSchema,
  kind: z.enum(['movie', 'series', 'album']),
  title: z.string(),
  year: z.number().nullable(),
  posterRef: z.string().nullable(),
  monitored: z.boolean(),
  hasFile: z.boolean(),
  sizeOnDiskBytes: z.number(),
  status: z.string(),
  instanceId: z.string(),
})

export const calendarEntryDtoSchema = z.object({
  id: z.string(),
  kind: z.enum(['movie', 'episode', 'album']),
  title: z.string(),
  subtitle: z.string().nullable(),
  releaseDate: z.string(),
  posterRef: z.string().nullable(),
  monitored: z.boolean(),
  hasFile: z.boolean(),
  instanceId: z.string(),
})
