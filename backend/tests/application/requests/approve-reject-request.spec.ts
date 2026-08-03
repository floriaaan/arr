import { test } from '@japa/runner'
import { InMemoryEventBus } from '#application/shared/event-bus'
import { ApproveRequest } from '#application/requests/approve-request.use-case'
import { RejectRequest } from '#application/requests/reject-request.use-case'
import { MediaRequest } from '#domain/requests/media-request.aggregate'
import { ExternalId } from '#domain/catalog/external-id.vo'
import { ExternalRef } from '#domain/requests/external-ref.vo'
import { Result } from '#domain/shared/result'
import { InMemoryMediaRequestRepository, FakeMediaProvisioning, FixedClock } from './fakes.js'

const OWNER = { id: 'user-1', isAdmin: false }
const ADMIN = { id: 'admin-1', isAdmin: true }

function anExternalId() {
  const result = ExternalId.create('tmdb', '550')
  if (!result.ok) throw new Error('unreachable')
  return result.value
}

function aPendingApprovalRequest() {
  return MediaRequest.request(
    '1',
    {
      requestedBy: 'user-1',
      kind: 'movie',
      externalId: anExternalId(),
      title: 'Fight Club',
      instanceId: 'instance-1',
      origin: 'manual',
      requiresApproval: true,
    },
    new Date(),
  )
}

test.group('ApproveRequest', () => {
  test('refuses a non-admin actor', async ({ assert }) => {
    const repository = new InMemoryMediaRequestRepository()
    await repository.save(aPendingApprovalRequest())
    const useCase = new ApproveRequest(
      repository,
      new FakeMediaProvisioning(),
      new FixedClock(),
      new InMemoryEventBus(),
    )

    const result = await useCase.execute({ id: '1', actor: OWNER })

    assert.isFalse(result.ok)
    assert.equal(!result.ok ? result.error : undefined, 'forbidden')
  })

  test('returns not_found for an unknown id', async ({ assert }) => {
    const repository = new InMemoryMediaRequestRepository()
    const useCase = new ApproveRequest(
      repository,
      new FakeMediaProvisioning(),
      new FixedClock(),
      new InMemoryEventBus(),
    )

    const result = await useCase.execute({ id: 'unknown', actor: ADMIN })

    assert.isFalse(result.ok)
    assert.equal(!result.ok ? result.error : undefined, 'not_found')
  })

  test('submits the request to the *arr on success', async ({ assert }) => {
    const repository = new InMemoryMediaRequestRepository()
    await repository.save(aPendingApprovalRequest())
    const provisioning = new FakeMediaProvisioning()
    provisioning.nextResult = Result.ok(ExternalRef.create('instance-1', 'remote-1'))
    const useCase = new ApproveRequest(
      repository,
      provisioning,
      new FixedClock(),
      new InMemoryEventBus(),
    )

    const result = await useCase.execute({ id: '1', actor: ADMIN })

    assert.isTrue(result.ok)
    if (result.ok) {
      assert.equal(result.value.status, 'submitted')
      assert.equal(result.value.approvedByUserId, 'admin-1')
    }
  })

  test('fails the request when provisioning refuses', async ({ assert }) => {
    const repository = new InMemoryMediaRequestRepository()
    await repository.save(aPendingApprovalRequest())
    const provisioning = new FakeMediaProvisioning()
    provisioning.nextResult = Result.err({
      type: 'instance_unavailable',
      message: 'Radarr is down',
    })
    const useCase = new ApproveRequest(
      repository,
      provisioning,
      new FixedClock(),
      new InMemoryEventBus(),
    )

    const result = await useCase.execute({ id: '1', actor: ADMIN })

    assert.isFalse(result.ok)
    const stored = await repository.findById('1')
    assert.equal(stored?.status, 'failed')
  })

  test('refuses a request that is not pending approval', async ({ assert }) => {
    const repository = new InMemoryMediaRequestRepository()
    const request = MediaRequest.request(
      '1',
      {
        requestedBy: 'user-1',
        kind: 'movie',
        externalId: anExternalId(),
        title: 'Fight Club',
        instanceId: 'instance-1',
        origin: 'manual',
        requiresApproval: false,
      },
      new Date(),
    )
    await repository.save(request)
    const useCase = new ApproveRequest(
      repository,
      new FakeMediaProvisioning(),
      new FixedClock(),
      new InMemoryEventBus(),
    )

    const result = await useCase.execute({ id: '1', actor: ADMIN })

    assert.isFalse(result.ok)
  })
})

test.group('RejectRequest', () => {
  test('refuses a non-admin actor', async ({ assert }) => {
    const repository = new InMemoryMediaRequestRepository()
    await repository.save(aPendingApprovalRequest())
    const useCase = new RejectRequest(repository, new FixedClock(), new InMemoryEventBus())

    const result = await useCase.execute({ id: '1', actor: OWNER, reason: 'no' })

    assert.isFalse(result.ok)
    assert.equal(!result.ok ? result.error : undefined, 'forbidden')
  })

  test('cancels the request and stores the reason', async ({ assert }) => {
    const repository = new InMemoryMediaRequestRepository()
    await repository.save(aPendingApprovalRequest())
    const useCase = new RejectRequest(repository, new FixedClock(), new InMemoryEventBus())

    const result = await useCase.execute({ id: '1', actor: ADMIN, reason: 'Not interesting' })

    assert.isTrue(result.ok)
    if (result.ok) {
      assert.equal(result.value.status, 'cancelled')
      assert.equal(result.value.rejectionReason, 'Not interesting')
    }
  })
})
