import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'

const ADMIN_EMAIL = 'admin@example.com'
const ADMIN_PASSWORD = 'correct-horse-battery-staple'

test.group('Onboarding flow', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('starts at not_started and reaches admin_created after creating the admin', async ({
    client,
    assert,
  }) => {
    const initial = await client.get('/api/onboarding/state')
    initial.assertStatus(200)
    assert.equal(initial.body().state, 'not_started')

    const created = await client
      .post('/api/onboarding/admin')
      .json({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
    created.assertStatus(201)
    assert.isString(created.body().userId)

    const afterCreate = await client.get('/api/onboarding/state')
    afterCreate.assertStatus(200)
    assert.equal(afterCreate.body().state, 'admin_created')
  })

  test('refuses a second admin account', async ({ client }) => {
    await client
      .post('/api/onboarding/admin')
      .json({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })

    const second = await client
      .post('/api/onboarding/admin')
      .json({ email: 'someone-else@example.com', password: ADMIN_PASSWORD })

    second.assertStatus(409)
    second.assertBodyContains({ error: { type: 'admin_already_exists' } })
  })

  test('signs the newly created admin in and resolves the session', async ({ client, assert }) => {
    await client
      .post('/api/onboarding/admin')
      .json({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })

    const signedIn = await client
      .post('/api/auth/sign-in/email')
      .json({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
    signedIn.assertStatus(200)

    // better-auth's own signed cookie, not an AdonisJS-signed one — read the
    // raw `Set-Cookie` header rather than `.cookie()`, which @japa/plugin-
    // adonisjs hijacks to unsign cookies through Adonis's `CookieClient`
    // (returns null for anything it didn't sign itself).
    const setCookieHeader = signedIn.header('set-cookie')
    const rawCookie = Array.isArray(setCookieHeader) ? setCookieHeader[0] : setCookieHeader
    assert.isString(rawCookie)
    const sessionCookie = rawCookie!.split(';')[0]

    const session = await client.get('/api/session').header('cookie', sessionCookie)
    session.assertStatus(200)
    assert.equal(session.body().user.email, ADMIN_EMAIL)
    assert.equal(session.body().user.role, 'admin')
  })

  // Régression : `{ config: null }` (bouton « Skip » de l'étape SSO) renvoyait
  // 422. La cause n'était pas la validation métier mais le bodyparser
  // AdonisJS, qui rejette un body JSON `null` nu avant même que le
  // contrôleur s'exécute — d'où le body enveloppé dans un objet.
  test('skipping SSO during onboarding accepts a null config', async ({ client, assert }) => {
    const skipped = await client.put('/api/onboarding/sso').json({ config: null })
    skipped.assertStatus(200)
    assert.isFalse(skipped.body().oidcEnabled)
  })
})
