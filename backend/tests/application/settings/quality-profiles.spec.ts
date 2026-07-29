import { test } from '@japa/runner'
import { ListQualityProfiles } from '#application/settings/list-quality-profiles.use-case'
import { GetQualityProfileSchema } from '#application/settings/get-quality-profile-schema.use-case'
import { ServarrInstance } from '#domain/settings/servarr-instance.aggregate'
import { Url } from '#domain/settings/url.vo'
import { ApiKey } from '#domain/settings/api-key.vo'
import { Result } from '#domain/shared/result'
import { InMemoryServarrInstanceRepository, FakeServarrQualityProfileManager } from './fakes.js'

function aUrl() {
  const result = Url.create('http://radarr.local:7878')
  if (!result.ok) throw new Error('unreachable')
  return result.value
}

function anApiKey() {
  const result = ApiKey.create('abc123')
  if (!result.ok) throw new Error('unreachable')
  return result.value
}

async function aRadarrInstance(repository: InMemoryServarrInstanceRepository) {
  const instance = ServarrInstance.draft('instance-1', 'radarr', aUrl(), anApiKey())
  await repository.save(instance)
  return instance
}

test.group('ListQualityProfiles', () => {
  test('returns instance_not_found for an unconfigured kind', async ({ assert }) => {
    const useCase = new ListQualityProfiles(
      new InMemoryServarrInstanceRepository(),
      new FakeServarrQualityProfileManager(),
    )

    const result = await useCase.execute({ kind: 'radarr' })

    assert.isFalse(result.ok)
    assert.equal(result.ok ? undefined : result.error, 'instance_not_found')
  })

  test('delegates to the manager for a configured instance', async ({ assert }) => {
    const instances = new InMemoryServarrInstanceRepository()
    await aRadarrInstance(instances)
    const manager = new FakeServarrQualityProfileManager()
    manager.listResult = Result.ok([
      { id: 1, name: 'HD-1080p', upgradeAllowed: true, cutoff: 1, items: [] },
    ])

    const useCase = new ListQualityProfiles(instances, manager)
    const result = await useCase.execute({ kind: 'radarr' })

    assert.isTrue(result.ok)
    assert.lengthOf(result.ok ? result.value : [], 1)
  })
})

test.group('GetQualityProfileSchema', () => {
  test('returns a template for a configured instance', async ({ assert }) => {
    const instances = new InMemoryServarrInstanceRepository()
    await aRadarrInstance(instances)

    const useCase = new GetQualityProfileSchema(instances, new FakeServarrQualityProfileManager())
    const result = await useCase.execute({ kind: 'radarr' })

    assert.isTrue(result.ok)
  })
})
