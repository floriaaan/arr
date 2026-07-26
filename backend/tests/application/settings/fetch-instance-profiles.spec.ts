import { test } from '@japa/runner'
import { FetchInstanceProfiles } from '#application/settings/fetch-instance-profiles.use-case'
import { Result } from '#domain/shared/result'
import { FakeServarrProfileCatalog } from './fakes.js'

test.group('FetchInstanceProfiles', () => {
  test('includes metadata profiles for a Lidarr instance', async ({ assert }) => {
    const catalog = new FakeServarrProfileCatalog()
    const useCase = new FetchInstanceProfiles(catalog)

    const result = await useCase.execute({
      kind: 'lidarr',
      baseUrl: 'http://lidarr.local',
      apiKey: 'abc',
    })

    assert.isTrue(result.ok)
    assert.isDefined(result.ok ? result.value.metadataProfiles : undefined)
    assert.isUndefined(result.ok ? result.value.languageProfiles : undefined)
  })

  test('includes language profiles for a Sonarr instance', async ({ assert }) => {
    const catalog = new FakeServarrProfileCatalog()
    const useCase = new FetchInstanceProfiles(catalog)

    const result = await useCase.execute({
      kind: 'sonarr',
      baseUrl: 'http://sonarr.local',
      apiKey: 'abc',
    })

    assert.isTrue(result.ok)
    assert.isDefined(result.ok ? result.value.languageProfiles : undefined)
    assert.isUndefined(result.ok ? result.value.metadataProfiles : undefined)
  })

  test('includes neither for a Radarr instance', async ({ assert }) => {
    const catalog = new FakeServarrProfileCatalog()
    const useCase = new FetchInstanceProfiles(catalog)

    const result = await useCase.execute({
      kind: 'radarr',
      baseUrl: 'http://radarr.local',
      apiKey: 'abc',
    })

    assert.isTrue(result.ok)
    assert.isUndefined(result.ok ? result.value.metadataProfiles : undefined)
    assert.isUndefined(result.ok ? result.value.languageProfiles : undefined)
  })

  test('short-circuits on the first failing call', async ({ assert }) => {
    const catalog = new FakeServarrProfileCatalog()
    catalog.rootFoldersResult = Result.err({ type: 'timeout', message: 'timed out' })
    const useCase = new FetchInstanceProfiles(catalog)

    const result = await useCase.execute({
      kind: 'radarr',
      baseUrl: 'http://radarr.local',
      apiKey: 'abc',
    })

    assert.isFalse(result.ok)
  })
})
