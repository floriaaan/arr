import { test } from '@japa/runner'
import { UserMediaAccount } from '#domain/watchlist/user-media-account.aggregate'

function aLinkedAccount() {
  return UserMediaAccount.link(
    '1',
    {
      userId: 'user-1',
      kind: 'plex',
      externalUserId: 'plex-42',
      username: 'alice',
      accessToken: 'tok_abc',
      baseUrl: null,
    },
    new Date('2026-01-01T00:00:00Z'),
  )
}

test.group('UserMediaAccount', () => {
  test('link() starts enabled with no sync history', ({ assert }) => {
    const account = aLinkedAccount()

    assert.isTrue(account.watchlistEnabled)
    assert.isNull(account.lastSyncedAt)
    assert.isNull(account.lastSyncError)
  })

  test('setWatchlistEnabled() toggles the flag', ({ assert }) => {
    const account = aLinkedAccount()

    account.setWatchlistEnabled(false, new Date())

    assert.isFalse(account.watchlistEnabled)
  })

  test('recordSyncSuccess() clears a previous error', ({ assert }) => {
    const account = aLinkedAccount()
    account.recordSyncFailure('token expired', new Date())

    account.recordSyncSuccess(new Date('2026-01-02T00:00:00Z'))

    assert.isNull(account.lastSyncError)
    assert.equal(account.lastSyncedAt?.toISOString(), '2026-01-02T00:00:00.000Z')
  })

  test('recordSyncFailure() keeps the previous lastSyncedAt', ({ assert }) => {
    const account = aLinkedAccount()
    account.recordSyncSuccess(new Date('2026-01-01T00:00:00Z'))

    account.recordSyncFailure('boom', new Date('2026-01-02T00:00:00Z'))

    assert.equal(account.lastSyncError, 'boom')
    assert.equal(account.lastSyncedAt?.toISOString(), '2026-01-01T00:00:00.000Z')
  })
})
