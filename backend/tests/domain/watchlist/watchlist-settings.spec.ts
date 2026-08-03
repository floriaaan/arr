import { test } from '@japa/runner'
import { WatchlistSettings } from '#domain/watchlist/watchlist-settings.aggregate'

test.group('WatchlistSettings', () => {
  test('create() defaults to enabled, hourly, capped at 20', ({ assert }) => {
    const settings = WatchlistSettings.create('1')

    assert.isTrue(settings.enabled)
    assert.equal(settings.intervalMinutes, 60)
    assert.equal(settings.maxNewRequestsPerRun, 20)
  })

  test('configure() replaces the settings wholesale', ({ assert }) => {
    const settings = WatchlistSettings.create('1')

    settings.configure({ enabled: false, intervalMinutes: 15, maxNewRequestsPerRun: 5 })

    assert.isFalse(settings.enabled)
    assert.equal(settings.intervalMinutes, 15)
    assert.equal(settings.maxNewRequestsPerRun, 5)
  })
})
