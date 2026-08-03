import { z } from 'zod'

export const userMediaAccountDtoSchema = z.object({
  id: z.string(),
  kind: z.enum(['plex', 'jellyfin', 'emby']),
  username: z.string(),
  baseUrl: z.string().nullable(),
  watchlistEnabled: z.boolean(),
  lastSyncedAt: z.string().nullable(),
  lastSyncError: z.string().nullable(),
  createdAt: z.string(),
})

export const userMediaAccountAdminDtoSchema = userMediaAccountDtoSchema.extend({
  user: z.object({ id: z.string(), email: z.string().nullable() }),
})

export const plexPinSchema = z.object({
  id: z.number(),
  code: z.string(),
  clientIdentifier: z.string(),
})

export const plexLinkStartSchema = z.object({
  pin: plexPinSchema,
  authUrl: z.string(),
})

export const plexLinkResultSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('pending') }),
  z.object({ status: z.literal('linked'), account: userMediaAccountDtoSchema }),
])

export const watchlistSettingsDtoSchema = z.object({
  enabled: z.boolean(),
  intervalMinutes: z.number(),
  maxNewRequestsPerRun: z.number(),
})
