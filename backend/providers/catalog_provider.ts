import type { ApplicationService } from '@adonisjs/core/types'
import type { MediaLookup } from '#domain/catalog/interfaces/media-lookup.interface'

export default class CatalogProvider {
  constructor(protected app: ApplicationService) {}

  register() {
    this.app.container.singleton('catalog.mediaLookup', async (resolver) => {
      const { ServarrMediaLookup } = await import('#infrastructure/servarr/servarr-media-lookup')
      const registry = await resolver.make('servarr.registry')
      return new ServarrMediaLookup(registry)
    })
  }
}

declare module '@adonisjs/core/types' {
  interface ContainerBindings {
    'catalog.mediaLookup': MediaLookup
  }
}
