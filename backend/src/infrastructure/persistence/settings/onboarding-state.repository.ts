import { DateTime } from 'luxon'
import OnboardingStateLucidModel from './onboarding_state.lucid.js'
import type { OnboardingStateRepository } from '#domain/settings/interfaces/onboarding-state-repository.interface'
import { OnboardingState, type OnboardingStatus } from '#domain/settings/onboarding-state.aggregate'

/** Singleton row — the fixed id is the whole enforcement mechanism (it's the primary key). */
const SINGLETON_ID = '00000000-0000-0000-0000-000000000002'

export class LucidOnboardingStateRepository implements OnboardingStateRepository {
  async get(): Promise<OnboardingState> {
    const row = await OnboardingStateLucidModel.find(SINGLETON_ID)
    if (!row) return OnboardingState.start(SINGLETON_ID)

    return OnboardingState.reconstruct(SINGLETON_ID, {
      status: row.status as OnboardingStatus,
      adminCreatedAt: row.adminCreatedAt?.toJSDate() ?? null,
      servicesConfiguredAt: row.servicesConfiguredAt?.toJSDate() ?? null,
      completedAt: row.completedAt?.toJSDate() ?? null,
    })
  }

  async save(state: OnboardingState): Promise<void> {
    const model =
      (await OnboardingStateLucidModel.find(SINGLETON_ID)) ?? new OnboardingStateLucidModel()
    model.id = SINGLETON_ID
    model.status = state.status
    model.adminCreatedAt = dateOrNull(state.adminCreatedAt)
    model.servicesConfiguredAt = dateOrNull(state.servicesConfiguredAt)
    model.completedAt = dateOrNull(state.completedAt)
    await model.save()
  }
}

function dateOrNull(date: Date | null): DateTime | null {
  return date ? DateTime.fromJSDate(date) : null
}
