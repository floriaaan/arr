import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import type { ApiClient } from '@japa/api-client'

const ADMIN_EMAIL = 'admin@example.com'
const ADMIN_PASSWORD = 'correct-horse-battery-staple'

/** Cf. tests/functional/requests.spec.ts for why this reads the raw cookie header. */
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

test.group('Instance profiles flow', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  /**
   * Regression test for a foreign key violation: SaveInstance used to save
   * the auto-created "Default" instance_profiles row before persisting the
   * brand-new servarr_instances row it points to, which the in-memory
   * fakes used by the unit tests can't catch (no FK there) — only a real
   * Postgres round-trip does.
   */
  test('creating a new instance does not violate the instance_profiles FK', async ({
    client,
    assert,
  }) => {
    const sessionCookie = await signInAsAdmin(client)

    const response = await client
      .put('/api/settings/instances/radarr')
      .header('cookie', sessionCookie)
      .json({
        baseUrl: 'http://radarr.local:7878',
        apiKey: 'abc123',
        rootFolderPath: '/data/movies',
        qualityProfileId: 1,
        enabled: false,
      })

    response.assertStatus(200)

    const profiles = await client
      .get('/api/settings/instances/radarr/saved-profiles')
      .header('cookie', sessionCookie)
    profiles.assertStatus(200)
    assert.lengthOf(profiles.body().profiles, 1)
    assert.equal(profiles.body().profiles[0].name, 'Default')
    assert.isTrue(profiles.body().profiles[0].isDefault)
  })
})
