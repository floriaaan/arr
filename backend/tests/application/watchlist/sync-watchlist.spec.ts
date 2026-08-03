import { test } from '@japa/runner'
import { InMemoryEventBus } from '#application/shared/event-bus'
import { CreateRequest } from '#application/requests/create-request.use-case'
import { SyncWatchlist } from '#application/watchlist/sync-watchlist.use-case'
import { UserMediaAccount } from '#domain/watchlist/user-media-account.aggregate'
import { MediaDetail } from '#domain/catalog/media-detail.entity'
import { ExternalId } from '#domain/catalog/external-id.vo'
import { ExternalRef } from '#domain/requests/external-ref.vo'
import { ServarrInstance } from '#domain/settings/servarr-instance.aggregate'
import { HealthCheckResult } from '#domain/settings/health-check-result.vo'
import { Url } from '#domain/settings/url.vo'
import { ApiKey } from '#domain/settings/api-key.vo'
import { RootFolderPath } from '#domain/settings/root-folder-path.vo'
import { QualityProfileId } from '#domain/settings/quality-profile-id.vo'
import { Result } from '#domain/shared/result'
import {
  FakeMediaLookup,
  InMemoryServarrInstanceRepository,
  InMemoryMediaRequestRepository,
  FakeMediaProvisioning,
  InMemoryRequestApprovalSettingsRepository,
  InMemoryUserRequestPreferencesRepository,
  SequentialIdGenerator,
  FixedClock,
} from '../requests/fakes.js'
import {
  InMemoryUserMediaAccountRepository,
  FakeWatchlistProviderResolver,
  InMemoryWatchlistSeenItemsRepository,
  InMemoryWatchlistSettingsRepository,
  FakeUserDirectory,
} from './fakes.js'

function anExternalId(value = '550') {
  const result = ExternalId.create('tmdb', value)
  if (!result.ok) throw new Error('unreachable')
  return result.value
}

function aMediaDetail(title = 'Fight Club') {
  return MediaDetail.create(anExternalId(), {
    kind: 'movie',
    title,
    year: 1999,
    overview: '',
    posterRef: null,
    alreadyManaged: false,
    genres: [],
  })
}

async function anActiveRadarrInstance(repository: InMemoryServarrInstanceRepository) {
  const baseUrl = Url.create('http://radarr.local')
  const apiKey = ApiKey.create('abc')
  const rootFolderPath = RootFolderPath.create('/data/movies')
  const qualityProfileId = QualityProfileId.create(1)
  if (!baseUrl.ok || !apiKey.ok || !rootFolderPath.ok || !qualityProfileId.ok)
    throw new Error('unreachable')

  const instance = ServarrInstance.draft('instance-1', 'radarr', baseUrl.value, apiKey.value)
  instance.configure(rootFolderPath.value, qualityProfileId.value, null, null, null, null)
  instance.recordHealthCheck(HealthCheckResult.healthy(new Date(), '5.14.0'))
  instance.enable()
  await repository.save(instance)
}

function aLinkedAccount(id = 'account-1') {
  return UserMediaAccount.link(
    id,
    {
      userId: 'user-1',
      kind: 'plex',
      externalUserId: 'plex-42',
      username: 'alice',
      accessToken: 'tok_abc',
      baseUrl: null,
    },
    new Date(),
  )
}

function setup() {
  const accounts = new InMemoryUserMediaAccountRepository()
  const providers = new FakeWatchlistProviderResolver()
  const seenItems = new InMemoryWatchlistSeenItemsRepository()
  const watchlistSettings = new InMemoryWatchlistSettingsRepository()
  const users = new FakeUserDirectory()

  const requestRepository = new InMemoryMediaRequestRepository()
  const provisioning = new FakeMediaProvisioning()
  provisioning.nextResult = Result.ok(ExternalRef.create('instance-1', 'remote-1'))
  const lookup = new FakeMediaLookup()
  lookup.detailResult = aMediaDetail()
  const instanceRepository = new InMemoryServarrInstanceRepository()
  const approvalSettings = new InMemoryRequestApprovalSettingsRepository()
  const userPreferences = new InMemoryUserRequestPreferencesRepository()

  const createRequest = new CreateRequest(
    requestRepository,
    provisioning,
    lookup,
    instanceRepository,
    approvalSettings,
    userPreferences,
    new SequentialIdGenerator(),
    new FixedClock(),
    new InMemoryEventBus(),
  )

  const sync = new SyncWatchlist(
    accounts,
    providers,
    seenItems,
    watchlistSettings,
    users,
    createRequest,
    new FixedClock(),
  )

  return {
    accounts,
    providers,
    seenItems,
    watchlistSettings,
    instanceRepository,
    requestRepository,
    sync,
  }
}

test.group('SyncWatchlist', () => {
  test('does nothing when disabled', async ({ assert }) => {
    const { accounts, watchlistSettings, sync } = setup()
    await accounts.save(aLinkedAccount())
    const settings = await watchlistSettings.get()
    settings.configure({ enabled: false, intervalMinutes: 60, maxNewRequestsPerRun: 20 })
    await watchlistSettings.save(settings)

    const summary = await sync.execute()

    assert.equal(summary.accountsProcessed, 0)
  })

  test('creates a request for each new item and marks it seen', async ({ assert }) => {
    const { accounts, providers, instanceRepository, requestRepository, seenItems, sync } = setup()
    await anActiveRadarrInstance(instanceRepository)
    const account = aLinkedAccount()
    await accounts.save(account)
    providers.provider.items = [
      { kind: 'movie', externalId: anExternalId('550'), title: 'Fight Club' },
    ]

    const summary = await sync.execute()

    assert.equal(summary.accountsProcessed, 1)
    assert.equal(summary.itemsSeen, 1)
    assert.equal(summary.requestsCreated, 1)
    assert.lengthOf(await requestRepository.findByFilter({}), 1)
    assert.isTrue(await seenItems.hasSeen(account.id, anExternalId('550')))
  })

  test('skips an item already seen — never re-proposed', async ({ assert }) => {
    const { accounts, providers, instanceRepository, requestRepository, seenItems, sync } = setup()
    await anActiveRadarrInstance(instanceRepository)
    const account = aLinkedAccount()
    await accounts.save(account)
    await seenItems.markSeen(account.id, anExternalId('550'), null, new Date())
    providers.provider.items = [
      { kind: 'movie', externalId: anExternalId('550'), title: 'Fight Club' },
    ]

    const summary = await sync.execute()

    assert.equal(summary.itemsSeen, 0)
    assert.equal(summary.requestsCreated, 0)
    assert.lengthOf(await requestRepository.findByFilter({}), 0)
  })

  test('stops at maxNewRequestsPerRun without marking the rest seen', async ({ assert }) => {
    const { accounts, providers, watchlistSettings, instanceRepository, seenItems, sync } = setup()
    await anActiveRadarrInstance(instanceRepository)
    const account = aLinkedAccount()
    await accounts.save(account)
    const settings = await watchlistSettings.get()
    settings.configure({ enabled: true, intervalMinutes: 60, maxNewRequestsPerRun: 1 })
    await watchlistSettings.save(settings)
    providers.provider.items = [
      { kind: 'movie', externalId: anExternalId('550'), title: 'Fight Club' },
      { kind: 'movie', externalId: anExternalId('551'), title: 'Se7en' },
    ]

    const summary = await sync.execute()

    assert.equal(summary.requestsCreated, 1)
    assert.isTrue(await seenItems.hasSeen(account.id, anExternalId('550')))
    assert.isFalse(await seenItems.hasSeen(account.id, anExternalId('551')))
  })

  test('records a sync failure without touching other accounts', async ({ assert }) => {
    const { accounts, providers, instanceRepository, sync } = setup()
    await anActiveRadarrInstance(instanceRepository)
    const failing = aLinkedAccount('account-1')
    const healthy = aLinkedAccount('account-2')
    await accounts.save(failing)
    await accounts.save(healthy)
    providers.provider.items = [
      { kind: 'movie', externalId: anExternalId('550'), title: 'Fight Club' },
    ]
    providers.provider.error = new Error('token expired')

    const summary = await sync.execute()

    assert.equal(summary.accountsProcessed, 2)
    assert.lengthOf(summary.errors, 2)
    const stored = await accounts.findById('account-1')
    assert.equal(stored?.lastSyncError, 'token expired')
  })

  test('stops an account without an active instance, without marking the item seen', async ({
    assert,
  }) => {
    const { accounts, providers, seenItems, sync } = setup()
    // No active Radarr instance configured.
    const account = aLinkedAccount()
    await accounts.save(account)
    providers.provider.items = [
      { kind: 'movie', externalId: anExternalId('550'), title: 'Fight Club' },
    ]

    const summary = await sync.execute()

    assert.equal(summary.requestsCreated, 0)
    assert.lengthOf(summary.errors, 1)
    assert.isFalse(await seenItems.hasSeen(account.id, anExternalId('550')))
  })
})
