import type { ApplicationService } from '@adonisjs/core/types'
import type { MediaRequestRepository } from '#domain/requests/interfaces/media-request-repository.interface'
import type { MediaProvisioning } from '#domain/requests/interfaces/media-provisioning.interface'
import type { DownloadProgress } from '#domain/requests/interfaces/download-progress.interface'
import type { RequestEpisodes } from '#domain/requests/interfaces/request-episodes.interface'
import type { RequestApprovalSettingsRepository } from '#domain/requests/interfaces/request-approval-settings-repository.interface'
import type { UserRequestPreferencesRepository } from '#domain/requests/interfaces/user-request-preferences-repository.interface'

export default class RequestsProvider {
  constructor(protected app: ApplicationService) {}

  register() {
    this.app.container.singleton('requests.repository', async () => {
      const { LucidMediaRequestRepository } =
        await import('#infrastructure/persistence/requests/media-request.repository')
      return new LucidMediaRequestRepository()
    })

    this.app.container.singleton('requests.approvalSettingsRepository', async () => {
      const { LucidRequestApprovalSettingsRepository } =
        await import('#infrastructure/persistence/requests/request-approval-settings.repository')
      return new LucidRequestApprovalSettingsRepository()
    })

    this.app.container.singleton('requests.userPreferencesRepository', async () => {
      const { LucidUserRequestPreferencesRepository } =
        await import('#infrastructure/persistence/requests/user-request-preferences.repository')
      return new LucidUserRequestPreferencesRepository()
    })

    this.app.container.singleton('requests.provisioning', async (resolver) => {
      const { ServarrMediaProvisioning } =
        await import('#infrastructure/servarr/servarr-media-provisioning')
      const registry = await resolver.make('servarr.registry')
      return new ServarrMediaProvisioning(registry)
    })

    this.app.container.singleton('requests.episodes', async (resolver) => {
      const { ServarrRequestEpisodes } =
        await import('#infrastructure/servarr/servarr-request-episodes')
      const registry = await resolver.make('servarr.registry')
      return new ServarrRequestEpisodes(registry)
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
    'requests.approvalSettingsRepository': RequestApprovalSettingsRepository
    'requests.userPreferencesRepository': UserRequestPreferencesRepository
    'requests.provisioning': MediaProvisioning
    'requests.episodes': RequestEpisodes
    'requests.downloadProgress': DownloadProgress
  }
}
