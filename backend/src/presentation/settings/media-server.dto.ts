import type { MediaServer } from '#domain/settings/media-server.aggregate'

export interface MediaServerDto {
  id: string
  kind: string
  baseUrl: string
  enabled: boolean
}

/**
 * Nothing to redact here, unlike `toServarrInstanceDto`: a media server holds
 * no credential at all (cf. docs/phase-5-quality-of-life, chantier 2
 * décision 1), which is what lets `GET /api/media-servers` sit behind
 * `authRequired` rather than `adminOnly`.
 */
export function toMediaServerDto(server: MediaServer): MediaServerDto {
  return {
    id: server.id,
    kind: server.kind,
    baseUrl: server.baseUrl.value,
    enabled: server.enabled,
  }
}
