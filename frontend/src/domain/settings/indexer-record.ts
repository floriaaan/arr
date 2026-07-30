import type { ServarrField } from './servarr-field'

/**
 * Deliberately not fully modeled beyond the fields every implementation
 * shares — mirrors the backend's `IndexerRecord` (cf.
 * docs/phase-4-download-clients-indexers): `fields[]` round-trips through
 * unmodified, only rendered generically by `DynamicFieldsForm`.
 */
export type IndexerRecord = Record<string, unknown> & {
  id?: number
  name: string
  implementation: string
  implementationName?: string
  configContract: string
  protocol: 'torrent' | 'usenet'
  enableRss: boolean
  enableAutomaticSearch: boolean
  enableInteractiveSearch: boolean
  priority: number
  fields: ServarrField[]
}
