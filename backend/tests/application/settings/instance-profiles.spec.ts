import { test } from '@japa/runner'
import { CreateInstanceProfile } from '#application/settings/create-instance-profile.use-case'
import { UpdateInstanceProfile } from '#application/settings/update-instance-profile.use-case'
import { SetDefaultInstanceProfile } from '#application/settings/set-default-instance-profile.use-case'
import { DeleteInstanceProfile } from '#application/settings/delete-instance-profile.use-case'
import { ListInstanceProfiles } from '#application/settings/list-instance-profiles.use-case'
import { ServarrInstance } from '#domain/settings/servarr-instance.aggregate'
import { Url } from '#domain/settings/url.vo'
import { ApiKey } from '#domain/settings/api-key.vo'
import {
  InMemoryServarrInstanceRepository,
  InMemoryInstanceProfileRepository,
  SequentialIdGenerator,
} from './fakes.js'

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

function validCreateInput(instanceId: string, overrides: Record<string, unknown> = {}) {
  return {
    instanceId,
    name: '4K',
    rootFolderPath: '/data/movies-4k',
    qualityProfileId: 2,
    ...overrides,
  }
}

test.group('CreateInstanceProfile', () => {
  test('the first profile created for an instance is forced default and syncs the instance', async ({
    assert,
  }) => {
    const instances = new InMemoryServarrInstanceRepository()
    const profiles = new InMemoryInstanceProfileRepository()
    const instance = await aRadarrInstance(instances)
    const useCase = new CreateInstanceProfile(profiles, instances, new SequentialIdGenerator())

    const result = await useCase.execute(validCreateInput(instance.id))

    assert.isTrue(result.ok)
    assert.isTrue(result.ok ? result.value.isDefault : false)

    const persistedInstance = await instances.findById(instance.id)
    assert.equal(persistedInstance?.rootFolderPath?.value, '/data/movies-4k')
    assert.equal(persistedInstance?.qualityProfileId?.value, 2)
  })

  test('a second, non-default profile does not change the instance', async ({ assert }) => {
    const instances = new InMemoryServarrInstanceRepository()
    const profiles = new InMemoryInstanceProfileRepository()
    const instance = await aRadarrInstance(instances)
    const useCase = new CreateInstanceProfile(profiles, instances, new SequentialIdGenerator())

    await useCase.execute(validCreateInput(instance.id, { name: 'Default' }))
    await useCase.execute(
      validCreateInput(instance.id, { name: 'Anime', rootFolderPath: '/data/anime' }),
    )

    const persistedInstance = await instances.findById(instance.id)
    assert.equal(persistedInstance?.rootFolderPath?.value, '/data/movies-4k')

    const all = await profiles.listByInstance(instance.id)
    assert.lengthOf(all, 2)
    assert.equal(all.filter((profile) => profile.isDefault).length, 1)
  })

  test('setAsDefault unmarks the previous default', async ({ assert }) => {
    const instances = new InMemoryServarrInstanceRepository()
    const profiles = new InMemoryInstanceProfileRepository()
    const instance = await aRadarrInstance(instances)
    const useCase = new CreateInstanceProfile(profiles, instances, new SequentialIdGenerator())

    const first = await useCase.execute(validCreateInput(instance.id, { name: 'Default' }))
    if (!first.ok) throw new Error('expected success')

    await useCase.execute(
      validCreateInput(instance.id, {
        name: 'Anime',
        rootFolderPath: '/data/anime',
        setAsDefault: true,
      }),
    )

    const all = await profiles.listByInstance(instance.id)
    const defaults = all.filter((profile) => profile.isDefault)
    assert.lengthOf(defaults, 1)
    assert.equal(defaults[0]?.name, 'Anime')

    const reloadedFirst = await profiles.findById(first.value.id)
    assert.isFalse(reloadedFirst?.isDefault)
  })

  test('returns instance_not_found for an unknown instance', async ({ assert }) => {
    const instances = new InMemoryServarrInstanceRepository()
    const profiles = new InMemoryInstanceProfileRepository()
    const useCase = new CreateInstanceProfile(profiles, instances, new SequentialIdGenerator())

    const result = await useCase.execute(validCreateInput('missing'))

    assert.isFalse(result.ok)
    assert.equal(result.ok ? undefined : result.error, 'instance_not_found')
  })
})

test.group('UpdateInstanceProfile', () => {
  test('editing the default profile re-syncs the instance', async ({ assert }) => {
    const instances = new InMemoryServarrInstanceRepository()
    const profiles = new InMemoryInstanceProfileRepository()
    const instance = await aRadarrInstance(instances)
    const created = await new CreateInstanceProfile(
      profiles,
      instances,
      new SequentialIdGenerator(),
    ).execute(validCreateInput(instance.id, { name: 'Default' }))
    if (!created.ok) throw new Error('expected success')

    const useCase = new UpdateInstanceProfile(profiles, instances)
    const result = await useCase.execute({
      id: created.value.id,
      name: 'Default',
      rootFolderPath: '/data/movies-v2',
      qualityProfileId: 3,
    })

    assert.isTrue(result.ok)
    const persistedInstance = await instances.findById(instance.id)
    assert.equal(persistedInstance?.rootFolderPath?.value, '/data/movies-v2')
    assert.equal(persistedInstance?.qualityProfileId?.value, 3)
  })

  test('editing a non-default profile leaves the instance untouched', async ({ assert }) => {
    const instances = new InMemoryServarrInstanceRepository()
    const profiles = new InMemoryInstanceProfileRepository()
    const instance = await aRadarrInstance(instances)
    const createUseCase = new CreateInstanceProfile(
      profiles,
      instances,
      new SequentialIdGenerator(),
    )
    await createUseCase.execute(validCreateInput(instance.id, { name: 'Default' }))
    const secondary = await createUseCase.execute(
      validCreateInput(instance.id, { name: 'Anime', rootFolderPath: '/data/anime' }),
    )
    if (!secondary.ok) throw new Error('expected success')

    const useCase = new UpdateInstanceProfile(profiles, instances)
    await useCase.execute({
      id: secondary.value.id,
      name: 'Anime',
      rootFolderPath: '/data/anime-v2',
      qualityProfileId: 5,
    })

    const persistedInstance = await instances.findById(instance.id)
    assert.equal(persistedInstance?.rootFolderPath?.value, '/data/movies-4k')
  })

  test('returns profile_not_found for an unknown profile', async ({ assert }) => {
    const instances = new InMemoryServarrInstanceRepository()
    const profiles = new InMemoryInstanceProfileRepository()
    const useCase = new UpdateInstanceProfile(profiles, instances)

    const result = await useCase.execute({
      id: 'missing',
      name: 'Default',
      rootFolderPath: '/data',
      qualityProfileId: 1,
    })

    assert.isFalse(result.ok)
    assert.equal(result.ok ? undefined : result.error, 'profile_not_found')
  })
})

test.group('SetDefaultInstanceProfile', () => {
  test('promotes a non-default profile and demotes the previous one', async ({ assert }) => {
    const instances = new InMemoryServarrInstanceRepository()
    const profiles = new InMemoryInstanceProfileRepository()
    const instance = await aRadarrInstance(instances)
    const createUseCase = new CreateInstanceProfile(
      profiles,
      instances,
      new SequentialIdGenerator(),
    )
    const first = await createUseCase.execute(validCreateInput(instance.id, { name: 'Default' }))
    const second = await createUseCase.execute(
      validCreateInput(instance.id, { name: 'Anime', rootFolderPath: '/data/anime' }),
    )
    if (!first.ok || !second.ok) throw new Error('expected success')

    const useCase = new SetDefaultInstanceProfile(profiles, instances)
    const result = await useCase.execute({ id: second.value.id })

    assert.isTrue(result.ok)
    const reloadedFirst = await profiles.findById(first.value.id)
    assert.isFalse(reloadedFirst?.isDefault)

    const persistedInstance = await instances.findById(instance.id)
    assert.equal(persistedInstance?.rootFolderPath?.value, '/data/anime')
  })
})

test.group('DeleteInstanceProfile', () => {
  test('refuses to delete the default profile', async ({ assert }) => {
    const instances = new InMemoryServarrInstanceRepository()
    const profiles = new InMemoryInstanceProfileRepository()
    const instance = await aRadarrInstance(instances)
    const created = await new CreateInstanceProfile(
      profiles,
      instances,
      new SequentialIdGenerator(),
    ).execute(validCreateInput(instance.id, { name: 'Default' }))
    if (!created.ok) throw new Error('expected success')

    const useCase = new DeleteInstanceProfile(profiles)
    const result = await useCase.execute({ id: created.value.id })

    assert.isFalse(result.ok)
    assert.equal(result.ok ? undefined : result.error, 'default_profile_delete_forbidden')
  })

  test('deletes a non-default profile', async ({ assert }) => {
    const instances = new InMemoryServarrInstanceRepository()
    const profiles = new InMemoryInstanceProfileRepository()
    const instance = await aRadarrInstance(instances)
    const createUseCase = new CreateInstanceProfile(
      profiles,
      instances,
      new SequentialIdGenerator(),
    )
    await createUseCase.execute(validCreateInput(instance.id, { name: 'Default' }))
    const secondary = await createUseCase.execute(
      validCreateInput(instance.id, { name: 'Anime', rootFolderPath: '/data/anime' }),
    )
    if (!secondary.ok) throw new Error('expected success')

    const useCase = new DeleteInstanceProfile(profiles)
    const result = await useCase.execute({ id: secondary.value.id })

    assert.isTrue(result.ok)
    const remaining = await new ListInstanceProfiles(profiles).execute({ instanceId: instance.id })
    assert.lengthOf(remaining, 1)
  })
})
