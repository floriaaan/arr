import { test } from '@japa/runner'
import { ServarrInstance } from '#domain/settings/servarr-instance.aggregate'
import { Url } from '#domain/settings/url.vo'
import { ApiKey } from '#domain/settings/api-key.vo'
import { RootFolderPath } from '#domain/settings/root-folder-path.vo'
import { QualityProfileId } from '#domain/settings/quality-profile-id.vo'
import { MetadataProfileId } from '#domain/settings/metadata-profile-id.vo'
import { LanguageProfileId } from '#domain/settings/language-profile-id.vo'
import { HealthCheckResult } from '#domain/settings/health-check-result.vo'

function aUrl() {
  const result = Url.create('http://radarr.local:7878')
  if (!result.ok) throw new Error('unreachable')
  return result.value
}

function anApiKey() {
  const result = ApiKey.create('abc123')
  if (!result.ok) throw new Error('unreachable')
  return result.value
}

function aRootFolderPath() {
  const result = RootFolderPath.create('/data/movies')
  if (!result.ok) throw new Error('unreachable')
  return result.value
}

function aQualityProfileId() {
  const result = QualityProfileId.create(4)
  if (!result.ok) throw new Error('unreachable')
  return result.value
}

function aMetadataProfileId() {
  const result = MetadataProfileId.create(1)
  if (!result.ok) throw new Error('unreachable')
  return result.value
}

test.group('ServarrInstance', () => {
  test('a freshly drafted instance is not enabled', ({ assert }) => {
    const instance = ServarrInstance.draft('1', 'radarr', aUrl(), anApiKey())
    assert.isFalse(instance.enabled)
  })

  test('configure() rejects a metadata profile for a non-Lidarr instance', ({ assert }) => {
    const instance = ServarrInstance.draft('1', 'radarr', aUrl(), anApiKey())
    const result = instance.configure(
      aRootFolderPath(),
      aQualityProfileId(),
      aMetadataProfileId(),
      null,
    )
    assert.isFalse(result.ok)
  })

  test('configure() requires a metadata profile for a Lidarr instance', ({ assert }) => {
    const instance = ServarrInstance.draft('1', 'lidarr', aUrl(), anApiKey())
    const result = instance.configure(aRootFolderPath(), aQualityProfileId(), null, null)
    assert.isFalse(result.ok)
  })

  test('configure() rejects a language profile for a non-Sonarr instance', ({ assert }) => {
    const instance = ServarrInstance.draft('1', 'radarr', aUrl(), anApiKey())
    const languageProfileIdResult = LanguageProfileId.create(1)
    if (!languageProfileIdResult.ok) throw new Error('unreachable')

    const result = instance.configure(
      aRootFolderPath(),
      aQualityProfileId(),
      null,
      languageProfileIdResult.value,
    )
    assert.isFalse(result.ok)
  })

  test('configure() succeeds for a well-formed Radarr instance', ({ assert }) => {
    const instance = ServarrInstance.draft('1', 'radarr', aUrl(), anApiKey())
    const result = instance.configure(aRootFolderPath(), aQualityProfileId(), null, null)
    assert.isTrue(result.ok)
  })

  test('enable() refuses an unconfigured instance', ({ assert }) => {
    const instance = ServarrInstance.draft('1', 'radarr', aUrl(), anApiKey())
    const result = instance.enable()
    assert.isFalse(result.ok)
  })

  test('enable() refuses an instance that never had a health check', ({ assert }) => {
    const instance = ServarrInstance.draft('1', 'radarr', aUrl(), anApiKey())
    instance.configure(aRootFolderPath(), aQualityProfileId(), null, null)

    const result = instance.enable()
    assert.isFalse(result.ok)
  })

  test('enable() refuses an instance whose last health check failed', ({ assert }) => {
    const instance = ServarrInstance.draft('1', 'radarr', aUrl(), anApiKey())
    instance.configure(aRootFolderPath(), aQualityProfileId(), null, null)
    instance.recordHealthCheck(
      HealthCheckResult.unhealthy(new Date(), { type: 'timeout', message: 'timed out' }),
    )

    const result = instance.enable()
    assert.isFalse(result.ok)
  })

  test('enable() succeeds once configured and healthy', ({ assert }) => {
    const instance = ServarrInstance.draft('1', 'radarr', aUrl(), anApiKey())
    instance.configure(aRootFolderPath(), aQualityProfileId(), null, null)
    instance.recordHealthCheck(HealthCheckResult.healthy(new Date(), '5.14.0'))

    const result = instance.enable()

    assert.isTrue(result.ok)
    assert.isTrue(instance.enabled)
  })

  test('recordHealthCheck() disables a previously-enabled instance on failure', ({ assert }) => {
    const instance = ServarrInstance.draft('1', 'radarr', aUrl(), anApiKey())
    instance.configure(aRootFolderPath(), aQualityProfileId(), null, null)
    instance.recordHealthCheck(HealthCheckResult.healthy(new Date(), '5.14.0'))
    instance.enable()

    instance.recordHealthCheck(
      HealthCheckResult.unhealthy(new Date(), { type: 'timeout', message: 'timed out' }),
    )

    assert.isFalse(instance.enabled)
  })

  test('recordHealthCheck() emits InstanceConnected on success', ({ assert }) => {
    const instance = ServarrInstance.draft('1', 'radarr', aUrl(), anApiKey())
    instance.recordHealthCheck(HealthCheckResult.healthy(new Date(), '5.14.0'))

    const events = instance.pullDomainEvents()
    assert.lengthOf(events, 1)
    assert.equal(events[0]?.name, 'InstanceConnected')
  })

  test('recordHealthCheck() emits InstanceHealthCheckFailed on failure', ({ assert }) => {
    const instance = ServarrInstance.draft('1', 'radarr', aUrl(), anApiKey())
    instance.recordHealthCheck(
      HealthCheckResult.unhealthy(new Date(), { type: 'timeout', message: 'timed out' }),
    )

    const events = instance.pullDomainEvents()
    assert.lengthOf(events, 1)
    assert.equal(events[0]?.name, 'InstanceHealthCheckFailed')
  })

  test('updateConnection() resets the health check and disables the instance', ({ assert }) => {
    const instance = ServarrInstance.draft('1', 'radarr', aUrl(), anApiKey())
    instance.configure(aRootFolderPath(), aQualityProfileId(), null, null)
    instance.recordHealthCheck(HealthCheckResult.healthy(new Date(), '5.14.0'))
    instance.enable()

    instance.updateConnection(aUrl(), anApiKey())

    assert.isFalse(instance.enabled)
    assert.isNull(instance.lastHealthCheck)
  })
})
