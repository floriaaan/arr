import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import type { ApiClient } from '@japa/api-client'

const ADMIN_EMAIL = 'admin@example.com'
const ADMIN_PASSWORD = 'correct-horse-battery-staple'

/**
 * Returns the raw `name=value` `Set-Cookie` pair, not `.cookie()` — that
 * helper is hijacked by @japa/plugin-adonisjs to unsign cookies through
 * Adonis's `CookieClient`, which doesn't understand better-auth's own
 * signed session cookie and silently returns `null`.
 */
async function signInAsAdmin(client: ApiClient): Promise<string> {
  await client.post('/api/onboarding/admin').json({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
  const signedIn = await client
    .post('/api/auth/sign-in/email')
    .json({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
  const setCookieHeader = signedIn.header('set-cookie')
  const rawCookie = Array.isArray(setCookieHeader) ? setCookieHeader[0] : setCookieHeader
  if (!rawCookie) throw new Error('sign-in did not set a session cookie')
  return rawCookie.split(';')[0]
}

test.group('Requests flow', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('rejects unauthenticated access', async ({ client }) => {
    const response = await client.get('/api/requests')
    response.assertStatus(401)
  })

  test('lists no requests for a freshly onboarded admin', async ({ client, assert }) => {
    const sessionCookie = await signInAsAdmin(client)

    const response = await client.get('/api/requests').header('cookie', sessionCookie)
    response.assertStatus(200)
    assert.deepEqual(response.body().requests, [])
  })

  test('refuses to create a request when no *arr instance is configured', async ({
    client,
    assert,
  }) => {
    const sessionCookie = await signInAsAdmin(client)

    const response = await client
      .post('/api/requests')
      .header('cookie', sessionCookie)
      .json({ kind: 'movie', externalId: { scheme: 'tmdb', value: '550' } })

    response.assertStatus(409)
    assert.equal(response.body().error.type, 'no_active_instance')
  })

  test('returns 404 for an unknown request id', async ({ client }) => {
    const sessionCookie = await signInAsAdmin(client)

    const response = await client
      .get('/api/requests/does-not-exist')
      .header('cookie', sessionCookie)
    response.assertStatus(404)
  })

  test('returns 404 when cancelling an unknown request', async ({ client }) => {
    const sessionCookie = await signInAsAdmin(client)

    const response = await client
      .post('/api/requests/does-not-exist/cancel')
      .header('cookie', sessionCookie)
    response.assertStatus(404)
  })
})
