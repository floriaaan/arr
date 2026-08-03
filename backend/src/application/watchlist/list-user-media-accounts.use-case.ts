import type { UseCase } from '#application/shared/use-case'
import type { UserMediaAccountRepository } from '#domain/watchlist/interfaces/user-media-account-repository.interface'
import type { UserMediaAccount } from '#domain/watchlist/user-media-account.aggregate'

/** Self-service — a user only ever lists their own linked accounts. */
export class ListUserMediaAccounts implements UseCase<string, UserMediaAccount[]> {
  constructor(private readonly repository: UserMediaAccountRepository) {}

  async execute(userId: string): Promise<UserMediaAccount[]> {
    return this.repository.findByUser(userId)
  }
}
