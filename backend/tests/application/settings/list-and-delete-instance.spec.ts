import { test } from '@japa/runner'
import { ListInstances } from '#application/settings/list-instances.use-case'
import { DeleteInstance } from '#application/settings/delete-instance.use-case'
import { ServarrInstance } from '#domain/settings/servarr-instance.aggregate'
import { Url } from '#domain/settings/url.vo'
import { ApiKey } from '#domain/settings/api-key.vo'
import { InMemoryServarrInstanceRepository } from './fakes.js'

function aUrl() {
  const result = Url.create('http://radarr.local')
  if (!result.ok) throw new Error('unreachable')
  return result.value
}

function anApiKey() {
  const result = ApiKey.create('abc')
  if (!result.ok) throw new Error('unreachable')
  return result.value
}

test.group('ListInstances / DeleteInstance', () => {
  test('ListInstances returns everything the repository has', async ({ assert }) => {
    const repository = new InMemoryServarrInstanceRepository()
    await repository.save(ServarrInstance.draft('1', 'radarr', aUrl(), anApiKey()))

    const result = await new ListInstances(repository).execute()

    assert.lengthOf(result, 1)
  })

  test('DeleteInstance removes the instance by id', async ({ assert }) => {
    const repository = new InMemoryServarrInstanceRepository()
    await repository.save(ServarrInstance.draft('1', 'radarr', aUrl(), anApiKey()))

    await new DeleteInstance(repository).execute({ id: '1' })

    assert.isNull(await repository.findById('1'))
  })
})
