import { test } from '@japa/runner'
import { QualityProfileId } from '#domain/settings/quality-profile-id.vo'
import { MetadataProfileId } from '#domain/settings/metadata-profile-id.vo'
import { LanguageProfileId } from '#domain/settings/language-profile-id.vo'

test.group('profile id value objects', () => {
  test('QualityProfileId accepts a positive integer', ({ assert }) => {
    assert.isTrue(QualityProfileId.create(4).ok)
  })

  test('MetadataProfileId rejects zero and negative numbers', ({ assert }) => {
    assert.isFalse(MetadataProfileId.create(0).ok)
    assert.isFalse(MetadataProfileId.create(-1).ok)
  })

  test('LanguageProfileId rejects non-integers', ({ assert }) => {
    assert.isFalse(LanguageProfileId.create(1.5).ok)
  })
})
