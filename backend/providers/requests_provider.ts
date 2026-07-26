import type { ApplicationService } from '@adonisjs/core/types'
import type { MediaRequestRepository } from '#domain/requests/interfaces/media-request-repository.interface'
import type { MediaProvisioning } from '#domain/requests/interfaces/media-provisioning.interface'
import type { DownloadProgress } from '#domain/requests/interfaces/download-progress.interface'

export default class RequestsProvider {
  constructor(protected app: ApplicationService) {}

  register() {
    this.app.container.singleton('requests.repository', async () => {
      const { LucidMediaRequestRepository } =
        await import('#infrastructure/persistence/requests/media-request.repository')
      return new LucidMediaRequestRepository()
    })

    this.app.container.singleton('requests.provisioning', async (resolver) => {
      const { ServarrMediaProvisioning } =
        await import('#infrastructure/servarr/servarr-media-provisioning')
      const registry = await resolver.make('servarr.registry')
      return new ServarrMediaProvisioning(registry)
    })

    this.app.container.singleton('requests.downloadProgress', async (resolver) => {
      const { ServarrDownloadProgress } =
        await import('#infrastructure/servarr/servarr-download-progress')
      const registry = await resolver.make('servarr.registry')
      return new ServarrDownloadProgress(registry)
    })
  }
}

declare module '@adonisjs/core/types' {
  interface ContainerBindings {
    'requests.repository': MediaRequestRepository
    'requests.provisioning': MediaProvisioning
    'requests.downloadProgress': DownloadProgress
  }
}
