import { Result } from '#domain/shared/result'
import type { Clock } from '#domain/shared/clock.interface'
import type { IdGenerator } from '#domain/shared/id-generator.interface'
import type { ServarrKind } from '#domain/settings/servarr-kind.vo'
import type { Url } from '#domain/settings/url.vo'
import type { ApiKey } from '#domain/settings/api-key.vo'
import type { HealthCheckResult } from '#domain/settings/health-check-result.vo'
import type { ConnectionError } from '#domain/settings/connection-error.vo'
import type { ServarrConnectionTester } from '#domain/settings/interfaces/servarr-connection-tester.interface'
import type {
  ProfileOption,
  RootFolderOption,
  ServarrProfileCatalog,
} from '#domain/settings/interfaces/servarr-profile-catalog.interface'
import type { ServarrInstanceRepository } from '#domain/settings/interfaces/servarr-instance-repository.interface'
import type { ServarrInstance } from '#domain/settings/servarr-instance.aggregate'
import type { InstanceProfileRepository } from '#domain/settings/interfaces/instance-profile-repository.interface'
import type { InstanceProfile } from '#domain/settings/instance-profile.aggregate'
import type {
  OidcDiscovery,
  OidcDiscoveryInfo,
} from '#domain/settings/interfaces/oidc-discovery.interface'
import type { AuthSettingsRepository } from '#domain/settings/interfaces/auth-settings-repository.interface'
import { AuthSettings } from '#domain/settings/auth-settings.aggregate'
import type { AuthSettingsProvider } from '#domain/settings/interfaces/auth-settings-provider.interface'
import type { EffectiveAuthSettings } from '#domain/settings/effective-auth-settings.vo'
import type { OnboardingStateRepository } from '#domain/settings/interfaces/onboarding-state-repository.interface'
import { OnboardingState } from '#domain/settings/onboarding-state.aggregate'
import type { UserDirectory } from '#domain/identity/interfaces/user-directory.interface'
import type { Email } from '#domain/identity/email.vo'
import type { User } from '#domain/identity/user.entity'
import type {
  AccountRegistrar,
  RegistrationError,
} from '#domain/identity/interfaces/account-registrar.interface'
import type { UserRole } from '#domain/identity/user-role.vo'
import { User as UserEntity } from '#domain/identity/user.entity'

export class FixedClock implements Clock {
  constructor(private readonly fixedNow: Date = new Date('2026-01-01T00:00:00Z')) {}

  now(): Date {
    return this.fixedNow
  }
}

export class SequentialIdGenerator implements IdGenerator {
  private counter = 0

  next(): string {
    this.counter += 1
    return `id-${this.counter}`
  }
}

export class FakeServarrConnectionTester implements ServarrConnectionTester {
  nextResult: Result<HealthCheckResult, ConnectionError> | null = null

  async test(
    _kind: ServarrKind,
    _baseUrl: Url,
    _apiKey: ApiKey,
  ): Promise<Result<HealthCheckResult, ConnectionError>> {
    if (!this.nextResult) throw new Error('FakeServarrConnectionTester.nextResult was not set')
    return this.nextResult
  }
}

export class FakeServarrProfileCatalog implements ServarrProfileCatalog {
  rootFoldersResult: Result<RootFolderOption[], ConnectionError> = Result.ok([{ path: '/data' }])
  qualityProfilesResult: Result<ProfileOption[], ConnectionError> = Result.ok([
    { id: 1, name: 'HD' },
  ])
  metadataProfilesResult: Result<ProfileOption[], ConnectionError> = Result.ok([
    { id: 1, name: 'Standard' },
  ])
  languageProfilesResult: Result<ProfileOption[], ConnectionError> = Result.ok([
    { id: 1, name: 'English' },
  ])

  async listRootFolders(): Promise<Result<RootFolderOption[], ConnectionError>> {
    return this.rootFoldersResult
  }

  async listQualityProfiles(): Promise<Result<ProfileOption[], ConnectionError>> {
    return this.qualityProfilesResult
  }

  async listMetadataProfiles(): Promise<Result<ProfileOption[], ConnectionError>> {
    return this.metadataProfilesResult
  }

  async listLanguageProfiles(): Promise<Result<ProfileOption[], ConnectionError>> {
    return this.languageProfilesResult
  }
}

export class InMemoryServarrInstanceRepository implements ServarrInstanceRepository {
  private byId = new Map<string, ServarrInstance>()

  async findAll(): Promise<ServarrInstance[]> {
    return [...this.byId.values()]
  }

  async findByKind(kind: ServarrKind): Promise<ServarrInstance | null> {
    return [...this.byId.values()].find((instance) => instance.kind === kind) ?? null
  }

  async findById(id: string): Promise<ServarrInstance | null> {
    return this.byId.get(id) ?? null
  }

  async findActive(): Promise<ServarrInstance[]> {
    return [...this.byId.values()].filter((instance) => instance.enabled)
  }

  async save(instance: ServarrInstance): Promise<void> {
    this.byId.set(instance.id, instance)
  }

  async delete(id: string): Promise<void> {
    this.byId.delete(id)
  }
}

export class InMemoryInstanceProfileRepository implements InstanceProfileRepository {
  private byId = new Map<string, InstanceProfile>()

  async listByInstance(instanceId: string): Promise<InstanceProfile[]> {
    return [...this.byId.values()].filter((profile) => profile.instanceId === instanceId)
  }

  async findById(id: string): Promise<InstanceProfile | null> {
    return this.byId.get(id) ?? null
  }

  async save(profile: InstanceProfile): Promise<void> {
    this.byId.set(profile.id, profile)
  }

  async delete(id: string): Promise<void> {
    this.byId.delete(id)
  }
}

export class FakeOidcDiscovery implements OidcDiscovery {
  nextResult: Result<OidcDiscoveryInfo, ConnectionError> | null = null

  async discover(): Promise<Result<OidcDiscoveryInfo, ConnectionError>> {
    if (!this.nextResult) throw new Error('FakeOidcDiscovery.nextResult was not set')
    return this.nextResult
  }
}

export class InMemoryAuthSettingsRepository implements AuthSettingsRepository {
  private settings = AuthSettings.create('auth-settings')

  async get(): Promise<AuthSettings> {
    return this.settings
  }

  async save(settings: AuthSettings): Promise<void> {
    this.settings = settings
  }
}

export class FakeAuthSettingsProvider implements AuthSettingsProvider {
  constructor(private readonly effective: EffectiveAuthSettings) {}

  async resolveEffective(): Promise<EffectiveAuthSettings> {
    return this.effective
  }
}

export class InMemoryOnboardingStateRepository implements OnboardingStateRepository {
  private state = OnboardingState.start('onboarding')

  async get(): Promise<OnboardingState> {
    return this.state
  }

  async save(state: OnboardingState): Promise<void> {
    this.state = state
  }
}

export class FakeUserDirectory implements UserDirectory {
  users: User[] = []

  async findById(id: string): Promise<User | null> {
    return this.users.find((user) => user.id === id) ?? null
  }

  async findByEmail(email: Email): Promise<User | null> {
    return this.users.find((user) => user.email.equals(email)) ?? null
  }

  async existsAny(): Promise<boolean> {
    return this.users.length > 0
  }
}

export class FakeAccountRegistrar implements AccountRegistrar {
  nextError: RegistrationError | null = null

  async register(
    email: Email,
    _password: string,
    role: UserRole,
  ): Promise<Result<User, RegistrationError>> {
    if (this.nextError) return Result.err(this.nextError)
    return Result.ok(UserEntity.create('registered-user', { email, role, createdAt: new Date() }))
  }
}
