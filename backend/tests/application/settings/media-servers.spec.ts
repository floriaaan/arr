import { test } from '@japa/runner'
import { ListMediaServers } from '#application/settings/list-media-servers.use-case'
import { SaveMediaServer } from '#application/settings/save-media-server.use-case'
import { DeleteMediaServer } from '#application/settings/delete-media-server.use-case'
import { InMemoryMediaServerRepository, SequentialIdGenerator } from './fakes.js'

function setup() {
  const repository = new InMemoryMediaServerRepository()
  const save = new SaveMediaServer(repository, new SequentialIdGenerator())
  return { repository, save }
}

test.group('SaveMediaServer / ListMediaServers / DeleteMediaServer', () => {
  test('saves a new media server, enabled, with a trailing-slash-free url', async ({ assert }) => {
    const { repository, save } = setup()

    const result = await save.execute({
      kind: 'plex',
      baseUrl: 'http://plex.local:32400/',
      enabled: true,
    })

    assert.isTrue(result.ok)
    if (!result.ok) return
    assert.equal(result.value.kind, 'plex')
    assert.equal(result.value.baseUrl.value, 'http://plex.local:32400')
    assert.isTrue(result.value.enabled)
    assert.lengthOf(await repository.findAll(), 1)
  })

  test('rejects a url that is not http(s)', async ({ assert }) => {
    const { repository, save } = setup()

    const result = await save.execute({ kind: 'jellyfin', baseUrl: 'ftp://nope', enabled: true })

    assert.isFalse(result.ok)
    assert.lengthOf(await repository.findAll(), 0)
  })

  test('upserts by kind rather than creating a second row', async ({ assert }) => {
    const { repository, save } = setup()
    await save.execute({ kind: 'emby', baseUrl: 'http://emby.local:8096', enabled: true })

    const result = await save.execute({
      kind: 'emby',
      baseUrl: 'http://emby.other:8096',
      enabled: false,
    })

    assert.isTrue(result.ok)
    const all = await repository.findAll()
    assert.lengthOf(all, 1)
    assert.equal(all[0].baseUrl.value, 'http://emby.other:8096')
    assert.isFalse(all[0].enabled)
  })

  test('ListMediaServers returns everything the repository has', async ({ assert }) => {
    const { repository, save } = setup()
    await save.execute({ kind: 'plex', baseUrl: 'http://plex.local:32400', enabled: true })
    await save.execute({ kind: 'jellyfin', baseUrl: 'http://jellyfin.local:8096', enabled: false })

    const servers = await new ListMediaServers(repository).execute()

    assert.lengthOf(servers, 2)
  })

  test('DeleteMediaServer removes by kind and is a no-op when absent', async ({ assert }) => {
    const { repository, save } = setup()
    await save.execute({ kind: 'plex', baseUrl: 'http://plex.local:32400', enabled: true })
    const deleteMediaServer = new DeleteMediaServer(repository)

    await deleteMediaServer.execute({ kind: 'plex' })
    await deleteMediaServer.execute({ kind: 'plex' })

    assert.isNull(await repository.findByKind('plex'))
  })
})
