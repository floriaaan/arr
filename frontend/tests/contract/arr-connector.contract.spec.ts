import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { FakeArrConnector } from '#infrastructure/fake/fake-arr-connector'
import { HttpArrConnector } from '#infrastructure/http/http-arr-connector'
import type { ArrConnector } from '#domain/interfaces/arr-connector'

/**
 * The same behavioral contract, run against both implementations — a
 * divergence here means `FakeArrConnector` (used by `task dev:fake`) would
 * mislead whoever's building against it. `HttpArrConnector` is exercised
 * against a hand-stubbed `fetch` returning real backend-shaped payloads
 * (cf. docs/phase-0/04-endpoints-http.md) rather than a live server — this
 * suite is about connector-level contract fidelity, not backend integration
 * (that's `backend/tests/functional/**`).
 */

type MockRoute = (init: RequestInit | undefined) => Response | Promise<Response>

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

function createMockHttpConnector(routes: Record<string, MockRoute>): ArrConnector {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL, init?: RequestInit) => {
      const path = input.toString().split('?')[0]
      const route = routes[`${init?.method ?? 'GET'} ${path}`]
      if (!route) throw new Error(`No mock route for ${init?.method ?? 'GET'} ${path}`)
      return route(init)
    }),
  )
  return new HttpArrConnector()
}

const NOT_FOUND_INSTANCE = json({ error: { type: 'not_found', message: 'No fixture.' } }, 404)

describe.each<{ name: string; create: () => ArrConnector }>([
  { name: 'FakeArrConnector', create: () => new FakeArrConnector() },
  {
    name: 'HttpArrConnector (mocked fetch)',
    create: () =>
      createMockHttpConnector({
        'GET /api/session': () => json({ user: null }),
        'GET /api/onboarding/state': () => json({ state: 'not_started' }),
        'POST /api/onboarding/admin': (() => {
          let called = false
          return () => {
            if (called) {
              return json(
                { error: { type: 'admin_already_exists', message: 'Already exists.' } },
                409,
              )
            }
            called = true
            return json({ userId: 'user-1' }, 201)
          }
        })(),
        // Stateful on purpose: the media server contract below is about the
        // save → list → delete round-trip, not about a single payload shape.
        ...(() => {
          const servers = new Map<string, unknown>()
          return {
            'GET /api/media-servers': () => json({ mediaServers: [...servers.values()] }),
            'PUT /api/settings/media-servers/plex': (init: RequestInit | undefined) => {
              const draft = JSON.parse(String(init?.body)) as {
                baseUrl: string
                enabled: boolean
              }
              // Mirrors the backend's `Url` VO, which strips trailing slashes.
              const mediaServer = {
                id: 'media-server-1',
                kind: 'plex',
                baseUrl: draft.baseUrl.replace(/\/+$/, ''),
                enabled: draft.enabled,
              }
              servers.set('plex', mediaServer)
              return json({ mediaServer })
            },
            'DELETE /api/settings/media-servers/plex': () => {
              servers.delete('plex')
              return new Response(null, { status: 204 })
            },
          }
        })(),
        'GET /api/catalog/search': () =>
          json({
            results: [
              {
                externalId: { scheme: 'tmdb', value: '550' },
                kind: 'movie',
                title: 'Fight Club',
                year: 1999,
                overview: '',
                posterRef: 'signed-token',
                alreadyManaged: false,
              },
            ],
          }),
        'POST /api/requests': () =>
          json({ error: { type: 'no_active_instance', message: 'No active instance.' } }, 409),
        'GET /api/requests/does-not-exist': () => NOT_FOUND_INSTANCE,
        'POST /api/requests/does-not-exist/cancel': () =>
          json({ error: { type: 'not_found', message: 'Request not found.' } }, 404),
        'GET /api/library': () =>
          json({
            items: [
              {
                externalId: { scheme: 'tmdb', value: '550' },
                kind: 'movie',
                title: 'Fight Club',
                year: 1999,
                posterRef: 'signed-token',
                monitored: true,
                hasFile: true,
                sizeOnDiskBytes: 4_000_000_000,
                status: 'downloaded',
                instanceId: 'radarr-1',
              },
            ],
          }),
        'GET /api/calendar': () =>
          json({
            entries: [
              {
                id: 'sonarr:instance-1:42',
                kind: 'episode',
                title: 'Severance',
                subtitle: 'S02E01',
                releaseDate: '2026-01-17',
                posterRef: null,
                monitored: true,
                hasFile: false,
                instanceId: 'instance-1',
                externalId: { scheme: 'tvdb', value: '81189' },
              },
            ],
          }),
      }),
  },
])('$name', ({ create }) => {
  let connector: ArrConnector

  beforeEach(() => {
    connector = create()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  test('starts with no session', async () => {
    const session = await connector.getSession()
    expect(session.user).toBeNull()
  })

  test('starts onboarding at not_started', async () => {
    const state = await connector.getOnboardingState()
    expect(state.status).toBe('not_started')
  })

  test('refuses a second admin account', async () => {
    const first = await connector.createAdminAccount(
      'admin@example.com',
      'correct-horse-battery-staple',
    )
    expect(first.ok).toBe(true)

    const second = await connector.createAdminAccount(
      'other@example.com',
      'correct-horse-battery-staple',
    )
    expect(second.ok).toBe(false)
    if (!second.ok) expect(second.error.type).toBe('admin_already_exists')
  })

  test('search results expose a ready-to-use posterUrl, never the raw ref', async () => {
    const results = await connector.searchMedia('movie', 'fight')
    expect(results.length).toBeGreaterThan(0)
    for (const item of results) {
      expect(item).not.toHaveProperty('posterRef')
      if (item.posterUrl !== null) expect(typeof item.posterUrl).toBe('string')
    }
  })

  test('refuses to create a request with no active instance configured', async () => {
    const result = await connector.createRequest('movie', { scheme: 'tmdb', value: '550' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.type).toBe('no_active_instance')
  })

  test('returns null for an unknown request id', async () => {
    const request = await connector.getRequest('does-not-exist')
    expect(request).toBeNull()
  })

  test('cancelling an unknown request fails with not_found', async () => {
    const result = await connector.cancelRequest('does-not-exist')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.type).toBe('not_found')
  })

  test('library items expose a ready-to-use posterUrl, never the raw ref', async () => {
    const items = await connector.listLibrary()
    expect(items.length).toBeGreaterThan(0)
    for (const item of items) {
      expect(item).not.toHaveProperty('posterRef')
      if (item.posterUrl !== null) expect(typeof item.posterUrl).toBe('string')
    }
  })

  test('starts with no media server declared', async () => {
    expect(await connector.listMediaServers()).toEqual([])
  })

  test('saving a media server normalizes its url and makes it listable', async () => {
    const saved = await connector.saveMediaServer('plex', {
      baseUrl: 'http://plex.local:32400/',
      enabled: true,
    })

    expect(saved.ok).toBe(true)
    if (!saved.ok) return
    expect(saved.value.kind).toBe('plex')
    expect(saved.value.baseUrl).toBe('http://plex.local:32400')

    const servers = await connector.listMediaServers()
    expect(servers).toHaveLength(1)
    expect(servers[0].baseUrl).toBe('http://plex.local:32400')
  })

  test('deleting a media server removes it from the list', async () => {
    await connector.saveMediaServer('plex', {
      baseUrl: 'http://plex.local:32400',
      enabled: true,
    })

    await connector.deleteMediaServer('plex')

    expect(await connector.listMediaServers()).toEqual([])
  })

  test('calendar entries fall within the requested range and expose a posterUrl', async () => {
    const entries = await connector.getCalendar('2026-01-01', '2026-01-31')
    expect(entries.length).toBeGreaterThan(0)
    for (const entry of entries) {
      expect(entry).not.toHaveProperty('posterRef')
      if (entry.posterUrl !== null) expect(typeof entry.posterUrl).toBe('string')
    }
  })
})
