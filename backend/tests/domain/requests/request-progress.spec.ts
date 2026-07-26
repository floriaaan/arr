import { test } from '@japa/runner'
import { RequestProgress } from '#domain/requests/request-progress.vo'

test.group('RequestProgress', () => {
  test('accepts a percentage within 0-100', ({ assert }) => {
    const result = RequestProgress.create({
      percentage: 42,
      sizeLeftBytes: 1000,
      eta: null,
      stepLabel: 'Downloading',
    })
    assert.isTrue(result.ok)
  })

  test('rejects a percentage above 100', ({ assert }) => {
    const result = RequestProgress.create({
      percentage: 101,
      sizeLeftBytes: 0,
      eta: null,
      stepLabel: '',
    })
    assert.isFalse(result.ok)
  })

  test('rejects a negative size left', ({ assert }) => {
    const result = RequestProgress.create({
      percentage: 50,
      sizeLeftBytes: -1,
      eta: null,
      stepLabel: '',
    })
    assert.isFalse(result.ok)
  })
})
