import { test } from '@japa/runner'
import { InstanceProfile } from '#domain/settings/instance-profile.aggregate'
import { RootFolderPath } from '#domain/settings/root-folder-path.vo'
import { QualityProfileId } from '#domain/settings/quality-profile-id.vo'
import { MetadataProfileId } from '#domain/settings/metadata-profile-id.vo'
import { LanguageProfileId } from '#domain/settings/language-profile-id.vo'

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

test.group('InstanceProfile', () => {
  test('create() succeeds for a well-formed Radarr profile', ({ assert }) => {
    const result = InstanceProfile.create(
      '1',
      'radarr',
      'instance-1',
      '4K',
      aRootFolderPath(),
      aQualityProfileId(),
      null,
      null,
      false,
    )
    assert.isTrue(result.ok)
  })

  test('create() rejects an empty name', ({ assert }) => {
    const result = InstanceProfile.create(
      '1',
      'radarr',
      'instance-1',
      '   ',
      aRootFolderPath(),
      aQualityProfileId(),
      null,
      null,
      false,
    )
    assert.isFalse(result.ok)
  })

  test('create() rejects a metadata profile for a non-Lidarr instance', ({ assert }) => {
    const result = InstanceProfile.create(
      '1',
      'radarr',
      'instance-1',
      '4K',
      aRootFolderPath(),
      aQualityProfileId(),
      aMetadataProfileId(),
      null,
      false,
    )
    assert.isFalse(result.ok)
  })

  test('create() requires a metadata profile for a Lidarr instance', ({ assert }) => {
    const result = InstanceProfile.create(
      '1',
      'lidarr',
      'instance-1',
      'Standard',
      aRootFolderPath(),
      aQualityProfileId(),
      null,
      null,
      false,
    )
    assert.isFalse(result.ok)
  })

  test('rename() trims and re-validates the name', ({ assert }) => {
    const created = InstanceProfile.create(
      '1',
      'radarr',
      'instance-1',
      '4K',
      aRootFolderPath(),
      aQualityProfileId(),
      null,
      null,
      false,
    )
    if (!created.ok) throw new Error('unreachable')

    const renamed = created.value.rename('  1080p  ')
    assert.isTrue(renamed.ok)
    assert.equal(created.value.name, '1080p')
  })

  test('markDefault() / unmarkDefault() toggle isDefault', ({ assert }) => {
    const created = InstanceProfile.create(
      '1',
      'radarr',
      'instance-1',
      '4K',
      aRootFolderPath(),
      aQualityProfileId(),
      null,
      null,
      false,
    )
    if (!created.ok) throw new Error('unreachable')

    created.value.markDefault()
    assert.isTrue(created.value.isDefault)

    created.value.unmarkDefault()
    assert.isFalse(created.value.isDefault)
  })

  test('updateSelection() rejects a language profile for a non-Sonarr instance', ({ assert }) => {
    const created = InstanceProfile.create(
      '1',
      'radarr',
      'instance-1',
      '4K',
      aRootFolderPath(),
      aQualityProfileId(),
      null,
      null,
      false,
    )
    if (!created.ok) throw new Error('unreachable')

    const languageProfileIdResult = LanguageProfileId.create(1)
    if (!languageProfileIdResult.ok) throw new Error('unreachable')

    const result = created.value.updateSelection(
      'radarr',
      aRootFolderPath(),
      aQualityProfileId(),
      null,
      languageProfileIdResult.value,
    )
    assert.isFalse(result.ok)
  })
})
