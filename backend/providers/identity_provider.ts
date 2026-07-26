import type { ApplicationService } from '@adonisjs/core/types'
import type { UserDirectory } from '#domain/identity/interfaces/user-directory.interface'

/**
 * Authentication/Session/AccountRegistrar are bound in Phase 4 once
 * better-auth is actually wired in — they need its running instance.
 * UserDirectory only reads the `user` table directly, so it can be wired
 * now (cf. docs/adr/0005-better-auth-tables-identite.md).
 */
export default class IdentityProvider {
  constructor(protected app: ApplicationService) {}

  register() {
    this.app.container.singleton('identity.userDirectory', async () => {
      const { BetterAuthUserDirectory } =
        await import('#infrastructure/persistence/identity/user-directory.repository')
      return new BetterAuthUserDirectory()
    })
  }
}

declare module '@adonisjs/core/types' {
  interface ContainerBindings {
    'identity.userDirectory': UserDirectory
  }
}
