import { Result } from '#domain/shared/result'
import { UserMediaAccount } from '#domain/watchlist/user-media-account.aggregate'
import type { UseCase } from '#application/shared/use-case'
import type {
  PlexLinkProvider,
  PlexPin,
} from '#domain/watchlist/interfaces/plex-link-provider.interface'
import type { UserMediaAccountRepository } from '#domain/watchlist/interfaces/user-media-account-repository.interface'
import type { ConnectionError } from '#domain/settings/connection-error.vo'
import type { IdGenerator } from '#domain/shared/id-generator.interface'
import type { Clock } from '#domain/shared/clock.interface'

export interface CompletePlexLinkInput {
  userId: string
  pin: PlexPin
}

/** `'pending'` — not an error, the user just hasn't finished authorizing in their browser tab yet. */
export type CompletePlexLinkError = ConnectionError | 'pending'

export class CompletePlexLink implements UseCase<
  CompletePlexLinkInput,
  Result<UserMediaAccount, CompletePlexLinkError>
> {
  constructor(
    private readonly plex: PlexLinkProvider,
    private readonly repository: UserMediaAccountRepository,
    private readonly idGenerator: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(
    input: CompletePlexLinkInput,
  ): Promise<Result<UserMediaAccount, CompletePlexLinkError>> {
    const polled = await this.plex.pollPin(input.pin)
    if (!polled.ok) return polled
    if (!polled.value) return Result.err('pending')

    const user = await this.plex.fetchUser(input.pin, polled.value)
    if (!user.ok) return user

    const existing = await this.repository.findByUserAndKind(input.userId, 'plex')
    const now = this.clock.now()
    const account = existing
      ? UserMediaAccount.reconstruct(existing.id, {
          userId: input.userId,
          kind: 'plex',
          externalUserId: user.value.id,
          username: user.value.username,
          accessToken: polled.value,
          baseUrl: null,
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
            kind: 'plex',
            externalUserId: user.value.id,
            username: user.value.username,
            accessToken: polled.value,
            baseUrl: null,
          },
          now,
        )

    await this.repository.save(account)
    return Result.ok(account)
  }
}
