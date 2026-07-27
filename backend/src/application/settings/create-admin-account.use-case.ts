import type { UseCase } from '#application/shared/use-case'
import type { UserDirectory } from '#domain/identity/interfaces/user-directory.interface'
import type {
  AccountRegistrar,
  RegistrationError,
} from '#domain/identity/interfaces/account-registrar.interface'
import type { OnboardingStateRepository } from '#domain/settings/interfaces/onboarding-state-repository.interface'
import type { InvalidTransition } from '#domain/shared/invalid-transition'
import type { Clock } from '#domain/shared/clock.interface'
import { Result } from '#domain/shared/result'
import { Email } from '#domain/identity/email.vo'

export interface CreateAdminAccountInput {
  email: string
  password: string
}

export type CreateAdminAccountError =
  RegistrationError | 'invalid_email' | 'admin_already_exists' | InvalidTransition

export interface CreateAdminAccountOutput {
  userId: string
}

export class CreateAdminAccount implements UseCase<
  CreateAdminAccountInput,
  Result<CreateAdminAccountOutput, CreateAdminAccountError>
> {
  constructor(
    private readonly userDirectory: UserDirectory,
    private readonly accountRegistrar: AccountRegistrar,
    private readonly onboardingStateRepository: OnboardingStateRepository,
    private readonly clock: Clock,
  ) {}

  async execute(
    input: CreateAdminAccountInput,
  ): Promise<Result<CreateAdminAccountOutput, CreateAdminAccountError>> {
    const alreadyExists = await this.userDirectory.existsAny()
    if (alreadyExists) {
      return Result.err('admin_already_exists')
    }

    const email = Email.create(input.email)
    if (!email.ok) {
      return Result.err('invalid_email')
    }

    const registered = await this.accountRegistrar.register(email.value, input.password, 'admin')
    if (!registered.ok) return registered

    const state = await this.onboardingStateRepository.get()
    const transitioned = state.markAdminCreated(this.clock.now())
    if (!transitioned.ok) return transitioned

    await this.onboardingStateRepository.save(state)
    return Result.ok({ userId: registered.value.id })
  }
}
