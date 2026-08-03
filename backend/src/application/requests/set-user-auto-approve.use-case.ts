import { Result } from '#domain/shared/result'
import type { UseCase } from '#application/shared/use-case'
import type { UserRequestPreferencesRepository } from '#domain/requests/interfaces/user-request-preferences-repository.interface'

export interface SetUserAutoApproveInput {
  userId: string
  /** `null` clears the override — the user falls back to the kind's global policy. */
  autoApprove: boolean | null
}

export class SetUserAutoApprove implements UseCase<SetUserAutoApproveInput, Result<void, never>> {
  constructor(private readonly repository: UserRequestPreferencesRepository) {}

  async execute(input: SetUserAutoApproveInput): Promise<Result<void, never>> {
    await this.repository.setAutoApprove(input.userId, input.autoApprove)
    return Result.ok(undefined)
  }
}
