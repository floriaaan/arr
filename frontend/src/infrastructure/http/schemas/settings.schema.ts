import { z } from 'zod'

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
  enabled: z.boolean(),
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
