import type { UseCase } from '#application/shared/use-case'
import type { OnboardingStateRepository } from '#domain/settings/interfaces/onboarding-state-repository.interface'
import type { ServarrInstanceRepository } from '#domain/settings/interfaces/servarr-instance-repository.interface'
import type { InvalidTransition } from '#domain/shared/invalid-transition'
import type { Clock } from '#domain/shared/clock.interface'
import { Result } from '#domain/shared/result'

export class CompleteOnboarding implements UseCase<
  void,
  Result<void, InvalidTransition | 'no_active_instance'>
> {
  constructor(
    private readonly onboardingStateRepository: OnboardingStateRepository,
    private readonly servarrInstanceRepository: ServarrInstanceRepository,
    private readonly clock: Clock,
  ) {}

  async execute(): Promise<Result<void, InvalidTransition | 'no_active_instance'>> {
    const state = await this.onboardingStateRepository.get()
    const activeInstances = await this.servarrInstanceRepository.findActive()

    const result = state.complete(this.clock.now(), activeInstances.length > 0)
    if (!result.ok) return result

    await this.onboardingStateRepository.save(state)
    return Result.ok(undefined)
  }
}
