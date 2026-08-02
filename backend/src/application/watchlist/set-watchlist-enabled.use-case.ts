import { Result } from '#domain/shared/result'
import type { UseCase } from '#application/shared/use-case'
import type { UserMediaAccountRepository } from '#domain/watchlist/interfaces/user-media-account-repository.interface'
import type { UserMediaAccount } from '#domain/watchlist/user-media-account.aggregate'
import type { Clock } from '#domain/shared/clock.interface'

export interface SetWatchlistEnabledInput {
  id: string
  userId: string
  enabled: boolean
}

export type SetWatchlistEnabledError = 'not_found' | 'forbidden'

export class SetWatchlistEnabled implements UseCase<
  SetWatchlistEnabledInput,
  Result<UserMediaAccount, SetWatchlistEnabledError>
> {
  constructor(
    private readonly repository: UserMediaAccountRepository,
    private readonly clock: Clock,
  ) {}

  async execute(
    input: SetWatchlistEnabledInput,
  ): Promise<Result<UserMediaAccount, SetWatchlistEnabledError>> {
    const account = await this.repository.findById(input.id)
    if (!account) return Result.err('not_found')
    if (account.userId !== input.userId) return Result.err('forbidden')

    account.setWatchlistEnabled(input.enabled, this.clock.now())
    await this.repository.save(account)
    return Result.ok(account)
  }
}
