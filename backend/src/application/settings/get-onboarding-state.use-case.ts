import type { UseCase } from '#application/shared/use-case'
import type { OnboardingStateRepository } from '#domain/settings/interfaces/onboarding-state-repository.interface'
import type { OnboardingState } from '#domain/settings/onboarding-state.aggregate'

export class GetOnboardingState implements UseCase<void, OnboardingState> {
  constructor(private readonly repository: OnboardingStateRepository) {}

  async execute(): Promise<OnboardingState> {
    return this.repository.get()
  }
}
