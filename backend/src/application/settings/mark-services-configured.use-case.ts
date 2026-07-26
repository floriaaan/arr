import type { UseCase } from '#application/shared/use-case'
import type { OnboardingStateRepository } from '#domain/settings/interfaces/onboarding-state-repository.interface'
import type { InvalidTransition } from '#domain/shared/invalid-transition'
import type { Clock } from '#domain/shared/clock.interface'
import { Result } from '#domain/shared/result'

export class MarkServicesConfigured implements UseCase<void, Result<void, InvalidTransition>> {
  constructor(
    private readonly repository: OnboardingStateRepository,
    private readonly clock: Clock,
  ) {}

  async execute(): Promise<Result<void, InvalidTransition>> {
    const state = await this.repository.get()
    const result = state.markServicesConfigured(this.clock.now())
    if (!result.ok) return result

    await this.repository.save(state)
    return Result.ok(undefined)
  }
}
