import { test } from '@japa/runner'
import { SeriesType } from '#domain/settings/series-type.vo'
import { MinimumAvailability } from '#domain/settings/minimum-availability.vo'

test.group('SeriesType', () => {
  test('accepts standard, daily, and anime', ({ assert }) => {
    assert.isTrue(SeriesType.create('standard').ok)
    assert.isTrue(SeriesType.create('daily').ok)
    assert.isTrue(SeriesType.create('anime').ok)
  })

  test('rejects an unknown value', ({ assert }) => {
    assert.isFalse(SeriesType.create('weekly').ok)
  })
})

test.group('MinimumAvailability', () => {
  test('accepts announced, inCinemas, released, and preDB', ({ assert }) => {
    assert.isTrue(MinimumAvailability.create('announced').ok)
    assert.isTrue(MinimumAvailability.create('inCinemas').ok)
    assert.isTrue(MinimumAvailability.create('released').ok)
    assert.isTrue(MinimumAvailability.create('preDB').ok)
  })

  test('rejects an unknown value', ({ assert }) => {
    assert.isFalse(MinimumAvailability.create('tba').ok)
  })
})
