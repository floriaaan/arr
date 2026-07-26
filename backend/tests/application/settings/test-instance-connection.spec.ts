import { test } from '@japa/runner'
import { TestInstanceConnection } from '#application/settings/test-instance-connection.use-case'
import { HealthCheckResult } from '#domain/settings/health-check-result.vo'
import { Result } from '#domain/shared/result'
import { FakeServarrConnectionTester } from './fakes.js'

test.group('TestInstanceConnection', () => {
  test('rejects a malformed base URL before calling the tester', async ({ assert }) => {
    const tester = new FakeServarrConnectionTester()
    const useCase = new TestInstanceConnection(tester)

    const result = await useCase.execute({ kind: 'radarr', baseUrl: 'not a url', apiKey: 'abc' })

    assert.isFalse(result.ok)
  })

  test('returns the tester result on success', async ({ assert }) => {
    const tester = new FakeServarrConnectionTester()
    tester.nextResult = Result.ok(HealthCheckResult.healthy(new Date(), '5.14.0'))
    const useCase = new TestInstanceConnection(tester)

    const result = await useCase.execute({
      kind: 'radarr',
      baseUrl: 'http://radarr.local',
      apiKey: 'abc',
    })

    assert.isTrue(result.ok)
  })

  test('propagates a connection error from the tester', async ({ assert }) => {
    const tester = new FakeServarrConnectionTester()
    tester.nextResult = Result.err({ type: 'unauthorized', message: 'invalid api key' })
    const useCase = new TestInstanceConnection(tester)

    const result = await useCase.execute({
      kind: 'radarr',
      baseUrl: 'http://radarr.local',
      apiKey: 'abc',
    })

    assert.isFalse(result.ok)
    assert.isTrue(!result.ok && 'type' in result.error && result.error.type === 'unauthorized')
  })
})
