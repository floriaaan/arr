import type { ServarrField } from './servarr-field'

/**
 * Deliberately not fully modeled beyond the fields every implementation
 * shares — mirrors the backend's `DownloadClientRecord` (cf.
 * docs/phase-4-download-clients-indexers): `fields[]` round-trips through
 * unmodified, only rendered generically by `DynamicFieldsForm`.
 */
export type DownloadClientRecord = Record<string, unknown> & {
  id?: number
  name: string
  implementation: string
  implementationName?: string
  configContract: string
  protocol: 'torrent' | 'usenet'
  enable: boolean
  priority: number
  fields: ServarrField[]
}
