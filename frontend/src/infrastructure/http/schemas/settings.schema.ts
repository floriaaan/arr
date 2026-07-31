import { z } from 'zod'
import type { QualityProfileItem } from '#domain/settings/quality-profile-record'

const qualityProfileItemSchema: z.ZodType<QualityProfileItem> = z.lazy(() =>
  z
    .object({
      id: z.number().optional(),
      name: z.string().optional(),
      allowed: z.boolean(),
      quality: z
        .object({
          id: z.number(),
          name: z.string(),
          source: z.string().optional(),
          resolution: z.number().optional(),
        })
        .optional(),
      items: z.array(qualityProfileItemSchema).optional(),
    })
    .passthrough(),
)

export const qualityProfileRecordSchema = z
  .object({
    id: z.number().optional(),
    name: z.string(),
    upgradeAllowed: z.boolean(),
    cutoff: z.number(),
    items: z.array(qualityProfileItemSchema),
  })
  .passthrough()

const servarrFieldSchema = z.object({ name: z.string() }).passthrough()

export const downloadClientRecordSchema = z
  .object({
    id: z.number().optional(),
    name: z.string(),
    implementation: z.string(),
    implementationName: z.string().optional(),
    configContract: z.string(),
    protocol: z.enum(['torrent', 'usenet']),
    enable: z.boolean(),
    priority: z.number(),
    fields: z.array(servarrFieldSchema),
  })
  .passthrough()

export const indexerRecordSchema = z
  .object({
    id: z.number().optional(),
    name: z.string(),
    implementation: z.string(),
    implementationName: z.string().optional(),
    configContract: z.string(),
    protocol: z.enum(['torrent', 'usenet']),
    enableRss: z.boolean(),
    enableAutomaticSearch: z.boolean(),
    enableInteractiveSearch: z.boolean(),
    priority: z.number(),
    fields: z.array(servarrFieldSchema),
  })
  .passthrough()

export const onboardingStatusSchema = z.enum([
  'not_started',
  'admin_created',
  'services_configured',
  'completed',
])

export const servarrInstanceDtoSchema = z.object({
  id: z.string(),
  kind: z.enum(['radarr', 'sonarr', 'lidarr']),
  baseUrl: z.string(),
  hasApiKey: z.boolean(),
  rootFolderPath: z.string().nullable(),
  qualityProfileId: z.number().nullable(),
  metadataProfileId: z.number().nullable(),
  languageProfileId: z.number().nullable(),
  seriesType: z.enum(['standard', 'daily', 'anime']).nullable(),
  minimumAvailability: z.enum(['announced', 'inCinemas', 'released', 'preDB']).nullable(),
  enabled: z.boolean(),
  lastCheckedAt: z.string().nullable(),
  healthy: z.boolean().nullable(),
  detectedVersion: z.string().nullable(),
  lastError: z.object({ type: z.string(), message: z.string() }).nullable(),
})

export const notificationSettingsDtoSchema = z.object({
  hasWebhookUrl: z.boolean(),
  authMode: z.enum(['none', 'token', 'basic']),
  hasToken: z.boolean(),
  username: z.string().nullable(),
  hasPassword: z.boolean(),
  onRequestAvailable: z.boolean(),
  onRequestFailed: z.boolean(),
  onInstanceUnreachable: z.boolean(),
})

export const mediaServerDtoSchema = z.object({
  id: z.string(),
  kind: z.enum(['plex', 'jellyfin', 'emby']),
  baseUrl: z.string(),
  enabled: z.boolean(),
})

export const discoveredInstanceSchema = z.object({
  kind: z.enum(['radarr', 'sonarr', 'lidarr', 'plex', 'jellyfin', 'emby']),
  baseUrl: z.string(),
  detectedVersion: z.string().nullable(),
  serverName: z.string().nullable(),
  confidence: z.enum(['confirmed', 'port']),
})

export const instanceProfilesSchema = z.object({
  rootFolders: z.array(z.object({ path: z.string() })),
  qualityProfiles: z.array(z.object({ id: z.number(), name: z.string() })),
  metadataProfiles: z.array(z.object({ id: z.number(), name: z.string() })).optional(),
  languageProfiles: z.array(z.object({ id: z.number(), name: z.string() })).optional(),
})

export const instanceProfileDtoSchema = z.object({
  id: z.string(),
  instanceId: z.string(),
  name: z.string(),
  rootFolderPath: z.string(),
  qualityProfileId: z.number(),
  metadataProfileId: z.number().nullable(),
  languageProfileId: z.number().nullable(),
  seriesType: z.enum(['standard', 'daily', 'anime']).nullable(),
  minimumAvailability: z.enum(['announced', 'inCinemas', 'released', 'preDB']).nullable(),
  isDefault: z.boolean(),
})

export const oidcDiscoverySchema = z.object({
  authorizationEndpoint: z.string(),
  tokenEndpoint: z.string(),
  userinfoEndpoint: z.string(),
})

export const effectiveAuthSettingsSchema = z.object({
  passwordLoginEnabled: z.boolean(),
  oidcConfigured: z.boolean(),
  source: z.enum(['database', 'environment']),
})

export const savedSsoConfigSchema = z
  .object({
    issuerUrl: z.string(),
    clientId: z.string(),
    claimsMapping: z.record(z.string(), z.string()).nullable(),
  })
  .nullable()
