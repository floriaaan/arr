import { test } from '@japa/runner'
import { buildCandidates, normalizeHost, PROBE_TARGETS } from '#infrastructure/discovery/candidates'

const NO_SUBNET = { extraHost: null, scanSubnet: false }

test.group('buildCandidates', () => {
  test('probes every target on the generic hosts', async ({ assert }) => {
    const candidates = buildCandidates(NO_SUBNET, [])

    for (const host of ['localhost', '127.0.0.1', 'host.docker.internal']) {
      const ports = candidates.filter((c) => c.host === host).map((c) => c.port)
      assert.deepEqual(ports.sort(), PROBE_TARGETS.map((target) => target.port).sort())
    }
  })

  test('probes a compose service name only on its own port', async ({ assert }) => {
    const candidates = buildCandidates(NO_SUBNET, [])

    assert.deepEqual(
      candidates.filter((c) => c.host === 'radarr').map((c) => c.port),
      [7878],
    )
    assert.deepEqual(
      candidates.filter((c) => c.host === 'plex').map((c) => c.port),
      [32400],
    )
  })

  test('classifies the emby service name as emby, not jellyfin', async ({ assert }) => {
    const candidates = buildCandidates(NO_SUBNET, [])

    const emby = candidates.filter((c) => c.host === 'emby')
    assert.lengthOf(emby, 1)
    assert.equal(emby[0]?.port, 8096)
    assert.equal(emby[0]?.expectedKind, 'emby')
    assert.equal(emby[0]?.family, 'jellyfin-emby')
  })

  test('adds every target for a user-supplied host', async ({ assert }) => {
    const candidates = buildCandidates({ extraHost: 'nas.local', scanSubnet: false }, [])

    assert.lengthOf(
      candidates.filter((c) => c.host === 'nas.local'),
      PROBE_TARGETS.length,
    )
  })

  test('sweeps the /24 of each local address, skipping the address itself', async ({ assert }) => {
    const candidates = buildCandidates({ extraHost: null, scanSubnet: true }, ['192.168.1.42'])

    const swept = new Set(
      candidates.filter((c) => c.host.startsWith('192.168.1.')).map((c) => c.host),
    )
    assert.equal(swept.size, 253)
    assert.isFalse(swept.has('192.168.1.42'))
    assert.isTrue(swept.has('192.168.1.1'))
    assert.isTrue(swept.has('192.168.1.254'))
  })

  test('never emits the same host:port twice', async ({ assert }) => {
    const candidates = buildCandidates({ extraHost: 'localhost', scanSubnet: true }, [
      '192.168.1.42',
      '192.168.1.43',
    ])

    const keys = candidates.map((c) => `${c.host}:${c.port}`)
    assert.equal(new Set(keys).size, keys.length)
  })

  test('does no sweeping when the option is off', async ({ assert }) => {
    const candidates = buildCandidates(NO_SUBNET, ['192.168.1.42'])

    assert.isEmpty(candidates.filter((c) => c.host.startsWith('192.168.1.')))
  })
})

test.group('normalizeHost', () => {
  test('keeps a bare host as-is', async ({ assert }) => {
    assert.equal(normalizeHost(' nas.local '), 'nas.local')
  })

  test('strips the port, the scheme and the path', async ({ assert }) => {
    assert.equal(normalizeHost('192.168.1.50:8096'), '192.168.1.50')
    assert.equal(normalizeHost('http://192.168.1.50:8096/web/index.html'), '192.168.1.50')
    assert.equal(normalizeHost('https://nas.local/'), 'nas.local')
  })

  test('rejects what cannot be a host', async ({ assert }) => {
    assert.isNull(normalizeHost(''))
    assert.isNull(normalizeHost('   '))
    assert.isNull(normalizeHost('two words'))
    assert.isNull(normalizeHost('http://'))
  })
})
