import { MediaServer } from '#domain/settings/media-server.aggregate'
import { Url } from '#domain/settings/url.vo'
import type MediaServerLucidModel from './media_server.lucid.js'
import type { MediaServerKind } from '#domain/settings/media-server-kind.vo'

export function toDomain(row: MediaServerLucidModel): MediaServer {
  const baseUrl = Url.create(row.baseUrl)
  if (!baseUrl.ok) throw new Error(baseUrl.error.message)

  return MediaServer.reconstruct(row.id, {
    kind: row.kind as MediaServerKind,
    baseUrl: baseUrl.value,
    enabled: row.enabled,
  })
}

export function applyToModel(server: MediaServer, model: MediaServerLucidModel): void {
  model.id = server.id
  model.kind = server.kind
  model.baseUrl = server.baseUrl.value
  model.enabled = server.enabled
}
