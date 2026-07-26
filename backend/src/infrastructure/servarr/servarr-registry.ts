import { BaseServarrClient } from './base-servarr-client.js'
import { RadarrAdapter } from './radarr/radarr.adapter.js'
import { SonarrAdapter } from './sonarr/sonarr.adapter.js'
import { LidarrAdapter } from './lidarr/lidarr.adapter.js'
import type { ServarrKindAdapter } from './servarr-kind-adapter.interface.js'
import type { ServarrInstanceRepository } from '#domain/settings/interfaces/servarr-instance-repository.interface'
import type { ServarrInstance } from '#domain/settings/servarr-instance.aggregate'
import type { ServarrKind } from '#domain/settings/servarr-kind.vo'
import type { MediaKind } from '#domain/catalog/media-kind.vo'
import type { ExternalIdScheme } from '#domain/catalog/external-id.vo'

const SERVARR_KIND_BY_MEDIA_KIND: Record<MediaKind, ServarrKind> = {
  movie: 'radarr',
  series: 'sonarr',
  album: 'lidarr',
}

const MEDIA_KIND_BY_EXTERNAL_ID_SCHEME: Record<ExternalIdScheme, MediaKind> = {
  tmdb: 'movie',
  tvdb: 'series',
  musicbrainz: 'album',
}

export function mediaKindForScheme(scheme: ExternalIdScheme): MediaKind {
  return MEDIA_KIND_BY_EXTERNAL_ID_SCHEME[scheme]
}

/** Resolves MediaKind -> the right adapter, from the currently active ServarrInstance rows. */
export class ServarrRegistry {
  private readonly adaptersByInstanceId = new Map<string, ServarrKindAdapter>()

  constructor(private readonly instanceRepository: ServarrInstanceRepository) {}

  async resolveByKind(kind: MediaKind): Promise<ServarrKindAdapter | null> {
    const instance = await this.instanceRepository.findByKind(SERVARR_KIND_BY_MEDIA_KIND[kind])
    if (!instance || !instance.enabled) return null
    return this.getOrCreateAdapter(instance)
  }

  async resolveByInstanceId(instanceId: string): Promise<ServarrKindAdapter | null> {
    const instance = await this.instanceRepository.findById(instanceId)
    if (!instance || !instance.enabled) return null
    return this.getOrCreateAdapter(instance)
  }

  private getOrCreateAdapter(instance: ServarrInstance): ServarrKindAdapter {
    const cached = this.adaptersByInstanceId.get(instance.id)
    if (cached) return cached

    const client = new BaseServarrClient(instance.baseUrl.value, instance.apiKey.reveal())
    const adapter = this.createAdapter(instance, client)
    this.adaptersByInstanceId.set(instance.id, adapter)
    return adapter
  }

  private createAdapter(instance: ServarrInstance, client: BaseServarrClient): ServarrKindAdapter {
    switch (instance.kind) {
      case 'radarr':
        return new RadarrAdapter(client, instance)
      case 'sonarr':
        return new SonarrAdapter(client, instance)
      case 'lidarr':
        return new LidarrAdapter(client, instance)
    }
  }
}
