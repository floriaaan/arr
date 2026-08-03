import type { UseCase } from '#application/shared/use-case'
import type { UserMediaAccountRepository } from '#domain/watchlist/interfaces/user-media-account-repository.interface'
import type { UserMediaAccount } from '#domain/watchlist/user-media-account.aggregate'

/** Admin-only diagnostics — every linked account, regardless of owner (cf. chantier 7). */
export class ListAllMediaAccounts implements UseCase<void, UserMediaAccount[]> {
  constructor(private readonly repository: UserMediaAccountRepository) {}

  async execute(): Promise<UserMediaAccount[]> {
    return this.repository.findAll()
  }
}
