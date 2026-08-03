import { Result } from '#domain/shared/result'
import { UserMediaAccount } from '#domain/watchlist/user-media-account.aggregate'
import type { UseCase } from '#application/shared/use-case'
import type { MediaServerAuthProvider } from '#domain/watchlist/interfaces/media-server-auth-provider.interface'
import type { UserMediaAccountRepository } from '#domain/watchlist/interfaces/user-media-account-repository.interface'
import type { ConnectionError } from '#domain/settings/connection-error.vo'
import type { IdGenerator } from '#domain/shared/id-generator.interface'
import type { Clock } from '#domain/shared/clock.interface'

export interface LinkMediaServerAccountInput {
  userId: string
  kind: 'jellyfin' | 'emby'
  baseUrl: string
  username: string
  password: string
}

/** Single-step, unlike Plex's PIN flow — the password itself is never persisted, only the resulting token. */
export class LinkMediaServerAccount implements UseCase<
  LinkMediaServerAccountInput,
  Result<UserMediaAccount, ConnectionError>
> {
  constructor(
    private readonly auth: MediaServerAuthProvider,
    private readonly repository: UserMediaAccountRepository,
    private readonly idGenerator: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(
    input: LinkMediaServerAccountInput,
  ): Promise<Result<UserMediaAccount, ConnectionError>> {
    const authenticated = await this.auth.authenticate(
      input.baseUrl,
      input.username,
      input.password,
    )
    if (!authenticated.ok) return authenticated

    const existing = await this.repository.findByUserAndKind(input.userId, input.kind)
    const now = this.clock.now()
    const account = existing
      ? UserMediaAccount.reconstruct(existing.id, {
          userId: input.userId,
          kind: input.kind,
          externalUserId: authenticated.value.externalUserId,
          username: authenticated.value.username,
          accessToken: authenticated.value.accessToken,
          baseUrl: input.baseUrl,
          watchlistEnabled: existing.watchlistEnabled,
          lastSyncedAt: existing.lastSyncedAt,
          lastSyncError: null,
          createdAt: existing.createdAt,
          updatedAt: now,
        })
      : UserMediaAccount.link(
          this.idGenerator.next(),
          {
            userId: input.userId,
            kind: input.kind,
            externalUserId: authenticated.value.externalUserId,
            username: authenticated.value.username,
            accessToken: authenticated.value.accessToken,
            baseUrl: input.baseUrl,
          },
          now,
        )

    await this.repository.save(account)
    return Result.ok(account)
  }
}
