import { z } from 'zod'

const externalIdSchema = z.object({
  scheme: z.enum(['tmdb', 'tvdb', 'musicbrainz']),
  value: z.string(),
})

const mediaKindSchema = z.enum(['movie', 'series', 'album'])

export const mediaItemDtoSchema = z.object({
  externalId: externalIdSchema,
  kind: mediaKindSchema,
  title: z.string(),
  year: z.number().nullable(),
  overview: z.string(),
  posterRef: z.string().nullable(),
  alreadyManaged: z.boolean(),
})

export const mediaDetailDtoSchema = mediaItemDtoSchema.extend({
  genres: z.array(z.string()),
  runtimeMinutes: z.number().optional(),
  network: z.string().optional(),
  status: z.string().optional(),
  managedBy: z
    .object({
      instanceId: z.string(),
      rootFolderPath: z.string(),
      qualityProfileId: z.number(),
    })
    .optional(),
})
