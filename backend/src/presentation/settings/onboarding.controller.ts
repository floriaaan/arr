import vine from '@vinejs/vine'
import type { HttpContext } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'
import { GetOnboardingState } from '#application/settings/get-onboarding-state.use-case'
import { CreateAdminAccount } from '#application/settings/create-admin-account.use-case'
import { TestInstanceConnection } from '#application/settings/test-instance-connection.use-case'
import { FetchInstanceProfiles } from '#application/settings/fetch-instance-profiles.use-case'
import { SaveInstance } from '#application/settings/save-instance.use-case'
import { MarkServicesConfigured } from '#application/settings/mark-services-configured.use-case'
import { TestOidcDiscovery } from '#application/settings/test-oidc-discovery.use-case'
import { SaveAuthSettings } from '#application/settings/save-auth-settings.use-case'
import { CompleteOnboarding } from '#application/settings/complete-onboarding.use-case'
import { serializeError } from '#presentation/shared/error-serializer'
import { toServarrInstanceDto } from './instance.dto.js'
import { instanceConnectionValidator, saveInstanceValidator } from './instance.validator.js'
import { testOidcValidator, saveOidcValidator } from './oidc.validator.js'
import type { ServarrKind } from '#domain/settings/servarr-kind.vo'

const createAdminValidator = vine.compile(
  vine.object({
    email: vine.string(),
    password: vine.string(),
  }),
)

export default class OnboardingController {
  async state(ctx: HttpContext) {
    const repository = await app.container.make('settings.onboardingStateRepository')
    const state = await new GetOnboardingState(repository).execute()
    return ctx.response.json({ state: state.status })
  }

  async createAdmin(ctx: HttpContext) {
    const payload = await ctx.request.validateUsing(createAdminValidator)

    const userDirectory = await app.container.make('identity.userDirectory')
    const accountRegistrar = await app.container.make('identity.accountRegistrar')
    const onboardingStateRepository = await app.container.make('settings.onboardingStateRepository')
    const clock = await app.container.make('shared.clock')

    const useCase = new CreateAdminAccount(
      userDirectory,
      accountRegistrar,
      onboardingStateRepository,
      clock,
    )
    const result = await useCase.execute(payload)
    if (!result.ok) {
      const { status, body } = serializeError(result.error)
      return ctx.response.status(status).send(body)
    }

    return ctx.response.status(201).send({ userId: result.value.userId })
  }

  async testInstance(ctx: HttpContext) {
    const payload = await ctx.request.validateUsing(instanceConnectionValidator)
    const tester = await app.container.make('settings.connectionTester')

    const result = await new TestInstanceConnection(tester).execute(payload)
    if (!result.ok) {
      if (!('type' in result.error)) {
        const { status, body } = serializeError(result.error)
        return ctx.response.status(status).send(body)
      }
      return ctx.response.json({
        ok: false,
        error: { type: result.error.type, message: result.error.message },
      })
    }

    return ctx.response.json({ ok: true, detectedVersion: result.value.detectedVersion })
  }

  async instanceProfiles(ctx: HttpContext) {
    const payload = await ctx.request.validateUsing(instanceConnectionValidator)
    const catalog = await app.container.make('settings.profileCatalog')

    const result = await new FetchInstanceProfiles(catalog).execute(payload)
    if (!result.ok) {
      const { status, body } = serializeError(result.error)
      return ctx.response.status(status).send(body)
    }

    return ctx.response.json(result.value)
  }

  async saveInstance(ctx: HttpContext) {
    const kind = ctx.params.kind as ServarrKind
    const payload = await ctx.request.validateUsing(saveInstanceValidator)

    const repository = await app.container.make('settings.instanceRepository')
    const tester = await app.container.make('settings.connectionTester')
    const idGenerator = await app.container.make('shared.idGenerator')

    const useCase = new SaveInstance(repository, tester, idGenerator)
    const result = await useCase.execute({ kind, ...payload })
    if (!result.ok) {
      const { status, body } = serializeError(result.error)
      return ctx.response.status(status).send(body)
    }

    const onboardingStateRepository = await app.container.make('settings.onboardingStateRepository')
    const clock = await app.container.make('shared.clock')
    await new MarkServicesConfigured(onboardingStateRepository, clock).execute()

    return ctx.response.json({ instance: toServarrInstanceDto(result.value) })
  }

  async testSso(ctx: HttpContext) {
    const payload = await ctx.request.validateUsing(testOidcValidator)
    const discovery = await app.container.make('settings.oidcDiscovery')

    const result = await new TestOidcDiscovery(discovery).execute(payload)
    if (!result.ok) {
      if (!('type' in result.error)) {
        const { status, body } = serializeError(result.error)
        return ctx.response.status(status).send(body)
      }
      return ctx.response.json({
        ok: false,
        error: { type: result.error.type, message: result.error.message },
      })
    }

    return ctx.response.json({ ok: true, discovery: result.value })
  }

  async saveSso(ctx: HttpContext) {
    const raw = ctx.request.raw()
    const parsed: unknown = raw ? JSON.parse(raw) : null

    const oidc = parsed === null ? null : await saveOidcValidator.validate(parsed)

    const repository = await app.container.make('settings.authSettingsRepository')
    const result = await new SaveAuthSettings(repository).execute({ oidc })
    if (!result.ok) {
      const { status, body } = serializeError(result.error)
      return ctx.response.status(status).send(body)
    }

    return ctx.response.json({ oidcEnabled: oidc !== null })
  }

  async complete(ctx: HttpContext) {
    const onboardingStateRepository = await app.container.make('settings.onboardingStateRepository')
    const instanceRepository = await app.container.make('settings.instanceRepository')
    const clock = await app.container.make('shared.clock')

    const useCase = new CompleteOnboarding(onboardingStateRepository, instanceRepository, clock)
    const result = await useCase.execute()
    if (!result.ok) {
      const { status, body } = serializeError(result.error)
      return ctx.response.status(status).send(body)
    }

    return ctx.response.json({ state: 'completed' })
  }
}
