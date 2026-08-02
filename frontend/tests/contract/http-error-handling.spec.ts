import { describe, test, expect, afterEach, vi } from 'vitest'
import { HttpArrConnector } from '#infrastructure/http/http-arr-connector'

/**
 * A handful of read/delete methods used to skip the `response.ok` check and
 * try to parse an error envelope as if it were the expected DTO shape,
 * surfacing an opaque Zod exception instead of the actual API error — cf.
 * PR #4 review. This locks in that a non-ok response always rejects with the
 * API's own error message.
 */
function stubErrorResponse(status: number, message: string) {
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () =>
        new Response(JSON.stringify({ error: { type: 'forbidden', message } }), {
          status,
          headers: { 'content-type': 'application/json' },
        }),
    ),
  )
}

describe('HttpArrConnector — non-ok responses reject with a real API error', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  test('listMediaServers() rejects with the API error message, not a Zod exception', async () => {
    stubErrorResponse(403, 'Admins only.')
    const connector = new HttpArrConnector()

    await expect(connector.listMediaServers()).rejects.toThrow('Admins only.')
  })

  test('getNotificationSettings() rejects with the API error message, not a Zod exception', async () => {
    stubErrorResponse(403, 'Admins only.')
    const connector = new HttpArrConnector()

    await expect(connector.getNotificationSettings()).rejects.toThrow('Admins only.')
  })

  test('deleteMediaServer() rejects instead of resolving as if it had succeeded', async () => {
    stubErrorResponse(403, 'Admins only.')
    const connector = new HttpArrConnector()

    await expect(connector.deleteMediaServer('plex')).rejects.toThrow('Admins only.')
  })
})
