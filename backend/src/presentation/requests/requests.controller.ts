import type { HttpContext } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'
import { ListRequests } from '#application/requests/list-requests.use-case'
import { GetRequest } from '#application/requests/get-request.use-case'
import { CreateRequest } from '#application/requests/create-request.use-case'
import { CancelRequest } from '#application/requests/cancel-request.use-case'
import { requireAuthenticatedUser } from '#presentation/shared/auth-context'
import { serializeError } from '#presentation/shared/error-serializer'
import { toMediaRequestDto, toMediaRequestDtoList } from './request.dto.js'
import { createRequestValidator } from './create-request.validator.js'
import type { RequestFilter } from '#domain/requests/request-filter.vo'
import type { RequestStatus } from '#domain/requests/request-status.vo'
import type { MediaKind } from '#domain/catalog/media-kind.vo'

const REQUEST_STATUSES: readonly RequestStatus[] = [
  'pending',
  'submitted',
  'downloading',
  'importing',
  'available',
  'failed',
  'cancelled',
]
const MEDIA_KINDS: readonly MediaKind[] = ['movie', 'series', 'album']

function isProvisioningError(error: unknown): error is { type: string; message: string } {
  return typeof error === 'object' && error !== null && 'type' in error && 'message' in error
}

export default class RequestsController {
  async index(ctx: HttpContext) {
    const user = requireAuthenticatedUser(ctx)
    const qs = ctx.request.qs()

    const filter: RequestFilter = {}
    if (typeof qs.status === 'string' && REQUEST_STATUSES.includes(qs.status as RequestStatus)) {
      filter.status = qs.status as RequestStatus
    }
    if (typeof qs.kind === 'string' && MEDIA_KINDS.includes(qs.kind as MediaKind)) {
      filter.kind = qs.kind as MediaKind
    }
    if (qs.requestedBy === 'me') {
      filter.requestedBy = user.id
    }

    const repository = await app.container.make('requests.repository')
    const userDirectory = await app.container.make('identity.userDirectory')

    const requests = await new ListRequests(repository).execute(filter)
    return ctx.response.json({ requests: await toMediaRequestDtoList(requests, userDirectory) })
  }

  async store(ctx: HttpContext) {
    const user = requireAuthenticatedUser(ctx)
    const payload = await ctx.request.validateUsing(createRequestValidator)

    const repository = await app.container.make('requests.repository')
    const provisioning = await app.container.make('requests.provisioning')
    const lookup = await app.container.make('catalog.mediaLookup')
    const instanceRepository = await app.container.make('settings.instanceRepository')
    const idGenerator = await app.container.make('shared.idGenerator')
    const clock = await app.container.make('shared.clock')

    const useCase = new CreateRequest(
      repository,
      provisioning,
      lookup,
      instanceRepository,
      idGenerator,
      clock,
    )
    const result = await useCase.execute({ requestedBy: user.id, ...payload })
    if (!result.ok) {
      if (isProvisioningError(result.error)) {
        return ctx.response.status(502).send({
          error: { type: 'provisioning_failed', message: result.error.message },
        })
      }
      const { status, body } = serializeError(result.error)
      return ctx.response.status(status).send(body)
    }

    const userDirectory = await app.container.make('identity.userDirectory')
    return ctx.response
      .status(201)
      .send({ request: await toMediaRequestDto(result.value, userDirectory) })
  }

  async show(ctx: HttpContext) {
    const user = requireAuthenticatedUser(ctx)
    const repository = await app.container.make('requests.repository')

    const result = await new GetRequest(repository).execute({
      id: ctx.params.id,
      actor: { id: user.id, isAdmin: user.role === 'admin' },
    })
    if (!result.ok) {
      const { status, body } = serializeError(result.error)
      return ctx.response.status(status).send(body)
    }

    const userDirectory = await app.container.make('identity.userDirectory')
    return ctx.response.json({ request: await toMediaRequestDto(result.value, userDirectory) })
  }

  async cancel(ctx: HttpContext) {
    const user = requireAuthenticatedUser(ctx)
    const repository = await app.container.make('requests.repository')
    const clock = await app.container.make('shared.clock')
    const provisioning = await app.container.make('requests.provisioning')

    const result = await new CancelRequest(repository, clock, provisioning).execute({
      id: ctx.params.id,
      actor: { id: user.id, isAdmin: user.role === 'admin' },
    })
    if (!result.ok) {
      if (typeof result.error === 'string') {
        const { status, body } = serializeError(result.error)
        return ctx.response.status(status).send(body)
      }
      return ctx.response.status(409).send({
        error: {
          type: 'not_cancellable',
          message: 'This request cannot be cancelled from its current status.',
          currentStatus: result.error.from,
        },
      })
    }

    // The cancellation stands either way; the *arr just didn't confirm it.
    if (result.value.provisioningError) {
      ctx.logger.warn(
        { requestId: ctx.params.id, reason: result.value.provisioningError },
        'Request cancelled locally but the *arr instance refused',
      )
    }

    const userDirectory = await app.container.make('identity.userDirectory')
    return ctx.response.json({
      request: await toMediaRequestDto(result.value.request, userDirectory),
    })
  }
}
