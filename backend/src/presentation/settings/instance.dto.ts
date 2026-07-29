import type { ServarrInstance } from '#domain/settings/servarr-instance.aggregate'

export interface ServarrInstanceDto {
  id: string
  kind: string
  baseUrl: string
  hasApiKey: true
  rootFolderPath: string | null
  qualityProfileId: number | null
  metadataProfileId: number | null
  languageProfileId: number | null
  seriesType: string | null
  minimumAvailability: string | null
  enabled: boolean
}

/** `apiKey` never travels in a response — only `hasApiKey: true` (cf. docs/phase-0/04-endpoints-http.md). */
export function toServarrInstanceDto(instance: ServarrInstance): ServarrInstanceDto {
  return {
    id: instance.id,
    kind: instance.kind,
    baseUrl: instance.baseUrl.value,
    hasApiKey: true,
    rootFolderPath: instance.rootFolderPath?.value ?? null,
    qualityProfileId: instance.qualityProfileId?.value ?? null,
    metadataProfileId: instance.metadataProfileId?.value ?? null,
    languageProfileId: instance.languageProfileId?.value ?? null,
    seriesType: instance.seriesType?.value ?? null,
    minimumAvailability: instance.minimumAvailability?.value ?? null,
    enabled: instance.enabled,
  }
}
