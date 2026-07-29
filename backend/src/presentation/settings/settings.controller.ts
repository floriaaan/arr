import type { HttpContext } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'
import { ListInstances } from '#application/settings/list-instances.use-case'
import { SaveInstance } from '#application/settings/save-instance.use-case'
import { DeleteInstance } from '#application/settings/delete-instance.use-case'
import { TestInstanceConnection } from '#application/settings/test-instance-connection.use-case'
import { FetchInstanceProfiles } from '#application/settings/fetch-instance-profiles.use-case'
import { ListInstanceProfiles } from '#application/settings/list-instance-profiles.use-case'
import { CreateInstanceProfile } from '#application/settings/create-instance-profile.use-case'
import { UpdateInstanceProfile } from '#application/settings/update-instance-profile.use-case'
import { SetDefaultInstanceProfile } from '#application/settings/set-default-instance-profile.use-case'
import { DeleteInstanceProfile } from '#application/settings/delete-instance-profile.use-case'
import { TestOidcDiscovery } from '#application/settings/test-oidc-discovery.use-case'
import { SaveAuthSettings } from '#application/settings/save-auth-settings.use-case'
import { GetEffectiveAuthSettings } from '#application/settings/get-effective-auth-settings.use-case'
import { serializeError } from '#presentation/shared/error-serializer'
import { toServarrInstanceDto } from './instance.dto.js'
import { toInstanceProfileDto } from './instance-profile.dto.js'
import { testConnectionForKindValidator, saveInstanceValidator } from './instance.validator.js'
import {
  createInstanceProfileValidator,
  updateInstanceProfileValidator,
} from './instance-profile.validator.js'
import { testOidcValidator, saveOidcValidator } from './oidc.validator.js'
import type { ServarrKind } from '#domain/settings/servarr-kind.vo'

export default class SettingsController {
  async listInstances(ctx: HttpContext) {
    const repository = await app.container.make('settings.instanceRepository')
    const instances = await new ListInstances(repository).execute()
    return ctx.response.json({ instances: instances.map(toServarrInstanceDto) })
  }

  async saveInstance(ctx: HttpContext) {
    const kind = ctx.params.kind as ServarrKind
    const payload = await ctx.request.validateUsing(saveInstanceValidator)

    const repository = await app.container.make('settings.instanceRepository')
    const tester = await app.container.make('settings.connectionTester')
    const idGenerator = await app.container.make('shared.idGenerator')
    const instanceProfileRepository = await app.container.make('settings.instanceProfileRepository')

    const result = await new SaveInstance(
      repository,
      tester,
      idGenerator,
      instanceProfileRepository,
    ).execute({
      kind,
      ...payload,
    })
    if (!result.ok) {
      const { status, body } = serializeError(result.error)
      return ctx.response.status(status).send(body)
    }

    return ctx.response.json({ instance: toServarrInstanceDto(result.value) })
  }

  async deleteInstance(ctx: HttpContext) {
    const kind = ctx.params.kind as ServarrKind
    const repository = await app.container.make('settings.instanceRepository')

    const instance = await repository.findByKind(kind)
    if (!instance) {
      const { status, body } = serializeError('instance_not_found')
      return ctx.response.status(status).send(body)
    }

    await new DeleteInstance(repository).execute({ id: instance.id })
    ctx.response.status(204)
    return ctx.response.send('')
  }

  async testInstanceConnection(ctx: HttpContext) {
    const kind = ctx.params.kind as ServarrKind
    const payload = await ctx.request.validateUsing(testConnectionForKindValidator)
    const tester = await app.container.make('settings.connectionTester')

    const result = await new TestInstanceConnection(tester).execute({ kind, ...payload })
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
    const kind = ctx.params.kind as ServarrKind
    const payload = await ctx.request.validateUsing(testConnectionForKindValidator)
    const catalog = await app.container.make('settings.profileCatalog')

    const result = await new FetchInstanceProfiles(catalog).execute({ kind, ...payload })
    if (!result.ok) {
      const { status, body } = serializeError(result.error)
      return ctx.response.status(status).send(body)
    }

    return ctx.response.json(result.value)
  }

  /**
   * Live catalog for an already-saved instance, using its stored (decrypted
   * server-side only) credentials — unlike `instanceProfiles`, the client
   * doesn't have to re-submit the api key it never got back in the first
   * place. Used by the `/profiles` page's "add profile" flow.
   */
  async catalogForInstance(ctx: HttpContext) {
    const kind = ctx.params.kind as ServarrKind
    const instanceRepository = await app.container.make('settings.instanceRepository')
    const instance = await instanceRepository.findByKind(kind)
    if (!instance) {
      const { status, body } = serializeError('instance_not_found')
      return ctx.response.status(status).send(body)
    }

    const catalog = await app.container.make('settings.profileCatalog')
    const result = await new FetchInstanceProfiles(catalog).execute({
      kind: instance.kind,
      baseUrl: instance.baseUrl.value,
      apiKey: instance.apiKey.reveal(),
    })
    if (!result.ok) {
      const { status, body } = serializeError(result.error)
      return ctx.response.status(status).send(body)
    }

    return ctx.response.json(result.value)
  }

  async listSavedProfiles(ctx: HttpContext) {
    const kind = ctx.params.kind as ServarrKind
    const instanceRepository = await app.container.make('settings.instanceRepository')
    const instance = await instanceRepository.findByKind(kind)
    if (!instance) {
      const { status, body } = serializeError('instance_not_found')
      return ctx.response.status(status).send(body)
    }

    const profileRepository = await app.container.make('settings.instanceProfileRepository')
    const profiles = await new ListInstanceProfiles(profileRepository).execute({
      instanceId: instance.id,
    })
    return ctx.response.json({ profiles: profiles.map(toInstanceProfileDto) })
  }

  async createSavedProfile(ctx: HttpContext) {
    const kind = ctx.params.kind as ServarrKind
    const payload = await ctx.request.validateUsing(createInstanceProfileValidator)

    const instanceRepository = await app.container.make('settings.instanceRepository')
    const instance = await instanceRepository.findByKind(kind)
    if (!instance) {
      const { status, body } = serializeError('instance_not_found')
      return ctx.response.status(status).send(body)
    }

    const profileRepository = await app.container.make('settings.instanceProfileRepository')
    const idGenerator = await app.container.make('shared.idGenerator')

    const result = await new CreateInstanceProfile(
      profileRepository,
      instanceRepository,
      idGenerator,
    ).execute({ instanceId: instance.id, ...payload })
    if (!result.ok) {
      const { status, body } = serializeError(result.error)
      return ctx.response.status(status).send(body)
    }

    return ctx.response.json({ profile: toInstanceProfileDto(result.value) })
  }

  async updateSavedProfile(ctx: HttpContext) {
    const id = ctx.params.id as string
    const payload = await ctx.request.validateUsing(updateInstanceProfileValidator)

    const profileRepository = await app.container.make('settings.instanceProfileRepository')
    const instanceRepository = await app.container.make('settings.instanceRepository')

    const result = await new UpdateInstanceProfile(profileRepository, instanceRepository).execute({
      id,
      ...payload,
    })
    if (!result.ok) {
      const { status, body } = serializeError(result.error)
      return ctx.response.status(status).send(body)
    }

    return ctx.response.json({ profile: toInstanceProfileDto(result.value) })
  }

  async deleteSavedProfile(ctx: HttpContext) {
    const id = ctx.params.id as string
    const profileRepository = await app.container.make('settings.instanceProfileRepository')

    const result = await new DeleteInstanceProfile(profileRepository).execute({ id })
    if (!result.ok) {
      const { status, body } = serializeError(result.error)
      return ctx.response.status(status).send(body)
    }

    ctx.response.status(204)
    return ctx.response.send('')
  }

  async setDefaultSavedProfile(ctx: HttpContext) {
    const id = ctx.params.id as string
    const profileRepository = await app.container.make('settings.instanceProfileRepository')
    const instanceRepository = await app.container.make('settings.instanceRepository')

    const result = await new SetDefaultInstanceProfile(
      profileRepository,
      instanceRepository,
    ).execute({
      id,
    })
    if (!result.ok) {
      const { status, body } = serializeError(result.error)
      return ctx.response.status(status).send(body)
    }

    return ctx.response.json({ profile: toInstanceProfileDto(result.value) })
  }

  async getSso(ctx: HttpContext) {
    const repository = await app.container.make('settings.authSettingsRepository')
    const settings = await repository.get()
    const oidc = settings.oidc

    return ctx.response.json({
      oidc: oidc
        ? {
            issuerUrl: oidc.issuerUrl.value,
            clientId: oidc.clientId,
            claimsMapping: oidc.claimsMapping ?? null,
          }
        : null,
    })
  }

  async updateSso(ctx: HttpContext) {
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

  async getAuthSettings(ctx: HttpContext) {
    const provider = await app.container.make('settings.authSettingsProvider')
    const effective = await new GetEffectiveAuthSettings(provider).execute()

    return ctx.response.json({
      passwordLoginEnabled: effective.passwordLoginEnabled,
      oidcConfigured: effective.oidc !== null,
      source: effective.oidcSource,
    })
  }
}
