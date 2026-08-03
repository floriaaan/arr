import type { UseCase } from '#application/shared/use-case'
import type { UserRequestPreferencesRepository } from '#domain/requests/interfaces/user-request-preferences-repository.interface'

export class ListUserRequestPreferences implements UseCase<void, Record<string, boolean | null>> {
  constructor(private readonly repository: UserRequestPreferencesRepository) {}

  async execute(): Promise<Record<string, boolean | null>> {
    return this.repository.listAll()
  }
}
