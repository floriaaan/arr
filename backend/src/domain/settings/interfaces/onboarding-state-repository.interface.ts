import type { OnboardingState } from '../onboarding-state.aggregate.js'

export interface OnboardingStateRepository {
  get(): Promise<OnboardingState>
  save(state: OnboardingState): Promise<void>
}
