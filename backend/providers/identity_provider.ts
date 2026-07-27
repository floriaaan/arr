import type { ApplicationService } from '@adonisjs/core/types'
import type { UserDirectory } from '#domain/identity/interfaces/user-directory.interface'
import type { Authentication } from '#domain/identity/interfaces/authentication.interface'
import type { Session } from '#domain/identity/interfaces/session.interface'
import type { AccountRegistrar } from '#domain/identity/interfaces/account-registrar.interface'

export default class IdentityProvider {
  constructor(protected app: ApplicationService) {}

  register() {
    this.app.container.singleton('identity.userDirectory', async () => {
      const { BetterAuthUserDirectory } =
        await import('#infrastructure/persistence/identity/user-directory.repository')
      return new BetterAuthUserDirectory()
    })

    this.app.container.singleton('identity.authentication', async (resolver) => {
      const { BetterAuthAuthentication } =
        await import('#infrastructure/auth/better-auth/authentication.adapter')
      const authSettingsProvider = await resolver.make('settings.authSettingsProvider')
      return new BetterAuthAuthentication(authSettingsProvider)
    })

    this.app.container.singleton('identity.session', async (resolver) => {
      const { BetterAuthSession } = await import('#infrastructure/auth/better-auth/session.adapter')
      const authSettingsProvider = await resolver.make('settings.authSettingsProvider')
      return new BetterAuthSession(authSettingsProvider)
    })

    this.app.container.singleton('identity.accountRegistrar', async (resolver) => {
      const { BetterAuthAccountRegistrar } =
        await import('#infrastructure/auth/better-auth/account-registrar.adapter')
      const authSettingsProvider = await resolver.make('settings.authSettingsProvider')
      return new BetterAuthAccountRegistrar(authSettingsProvider)
    })

    this.app.container.singleton('identity.authHandler', async (resolver) => {
      const { getAuthInstance } = await import('#infrastructure/auth/better-auth/instance')
      const authSettingsProvider = await resolver.make('settings.authSettingsProvider')
      return async (request: Request) => {
        const auth = await getAuthInstance(authSettingsProvider)
        return auth.handler(request)
      }
    })
  }
}

declare module '@adonisjs/core/types' {
  interface ContainerBindings {
    'identity.userDirectory': UserDirectory
    'identity.authentication': Authentication
    'identity.session': Session
    'identity.accountRegistrar': AccountRegistrar
    'identity.authHandler': (request: Request) => Promise<Response>
  }
}
