import { z } from 'zod'

const externalIdSchema = z.object({
  scheme: z.enum(['tmdb', 'tvdb', 'musicbrainz']),
  value: z.string(),
})

const requestStatusSchema = z.enum([
  'pending',
  'submitted',
  'downloading',
  'importing',
  'available',
  'failed',
  'cancelled',
])

const requestProgressSchema = z.object({
  percentage: z.number(),
  sizeLeftBytes: z.number(),
  eta: z.string().nullable(),
  stepLabel: z.string(),
})

export const mediaRequestDtoSchema = z.object({
  id: z.string(),
  requestedBy: z.object({ id: z.string(), email: z.string().nullable() }),
  kind: z.enum(['movie', 'series', 'album']),
  externalId: externalIdSchema,
  title: z.string(),
  status: requestStatusSchema,
  progress: requestProgressSchema.nullable(),
  failureReason: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
