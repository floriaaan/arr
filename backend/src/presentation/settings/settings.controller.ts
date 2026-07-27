import type { HttpContext } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'
import { ListInstances } from '#application/settings/list-instances.use-case'
import { SaveInstance } from '#application/settings/save-instance.use-case'
import { DeleteInstance } from '#application/settings/delete-instance.use-case'
import { TestInstanceConnection } from '#application/settings/test-instance-connection.use-case'
import { TestOidcDiscovery } from '#application/settings/test-oidc-discovery.use-case'
import { SaveAuthSettings } from '#application/settings/save-auth-settings.use-case'
import { GetEffectiveAuthSettings } from '#application/settings/get-effective-auth-settings.use-case'
import { serializeError } from '#presentation/shared/error-serializer'
import { toServarrInstanceDto } from './instance.dto.js'
import { testConnectionForKindValidator, saveInstanceValidator } from './instance.validator.js'
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

    const result = await new SaveInstance(repository, tester, idGenerator).execute({
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
