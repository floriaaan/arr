import { describe, test, expect } from 'vitest'
import { pwaOptions } from '../../vite-pwa.config'

describe('pwaOptions', () => {
  test('manifest has the required installability fields', () => {
    const manifest = pwaOptions.manifest
    // manifest is typed `false | Partial<ManifestOptions>` (it can be
    // disabled entirely) — narrow it before asserting on its fields.
    if (!manifest) throw new Error('expected pwaOptions.manifest to be set')

    expect(manifest.name).toBe('arr')
    expect(manifest.display).toBe('standalone')
    expect(manifest.start_url).toBe('/')

    const icons = manifest.icons ?? []
    expect(icons.some((icon) => icon.purpose === 'maskable')).toBe(true)
    expect(icons.some((icon) => icon.sizes === '512x512' && icon.purpose !== 'maskable')).toBe(true)
  })

  test('no service-worker config — vite-plugin-pwa cannot generate one under this build', () => {
    expect(pwaOptions.workbox).toBeUndefined()
    expect(pwaOptions.registerType).toBeUndefined()
  })
})
