import type { ApplicationService } from '@adonisjs/core/types'
import type { MediaLookup } from '#domain/catalog/interfaces/media-lookup.interface'
import type { MediaLibrary } from '#domain/catalog/interfaces/media-library.interface'

export default class CatalogProvider {
  constructor(protected app: ApplicationService) {}

  register() {
    this.app.container.singleton('catalog.mediaLookup', async (resolver) => {
      const { ServarrMediaLookup } = await import('#infrastructure/servarr/servarr-media-lookup')
      const registry = await resolver.make('servarr.registry')
      return new ServarrMediaLookup(registry)
    })

    this.app.container.singleton('catalog.mediaLibrary', async (resolver) => {
      const { ServarrMediaLibrary } = await import('#infrastructure/servarr/servarr-media-library')
      const registry = await resolver.make('servarr.registry')
      return new ServarrMediaLibrary(registry)
    })
  }
}

declare module '@adonisjs/core/types' {
  interface ContainerBindings {
    'catalog.mediaLookup': MediaLookup
    'catalog.mediaLibrary': MediaLibrary
  }
}
