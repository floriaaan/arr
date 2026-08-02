import { Result } from '#domain/shared/result'
import type { UseCase } from '#application/shared/use-case'
import type { UserMediaAccountRepository } from '#domain/watchlist/interfaces/user-media-account-repository.interface'

export interface UnlinkMediaAccountInput {
  id: string
  userId: string
}

export type UnlinkMediaAccountError = 'not_found' | 'forbidden'

export class UnlinkMediaAccount implements UseCase<
  UnlinkMediaAccountInput,
  Result<void, UnlinkMediaAccountError>
> {
  constructor(private readonly repository: UserMediaAccountRepository) {}

  async execute(input: UnlinkMediaAccountInput): Promise<Result<void, UnlinkMediaAccountError>> {
    const account = await this.repository.findById(input.id)
    if (!account) return Result.err('not_found')
    if (account.userId !== input.userId) return Result.err('forbidden')

    await this.repository.delete(input.id)
    return Result.ok(undefined)
  }
}
