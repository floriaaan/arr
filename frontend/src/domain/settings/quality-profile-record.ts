export interface QualityProfileItem {
  id?: number
  name?: string
  allowed: boolean
  quality?: { id: number; name: string; source?: string; resolution?: number }
  /** Nested group — rare, only present when hand-crafted in the *arr's own UI. */
  items?: QualityProfileItem[]
}

/**
 * Deliberately not fully modeled — mirrors the backend's `QualityProfileRecord`
 * (cf. docs/phase-3-instance-profiles/01-live-quality-profiles.md): only the
 * fields this app edits are typed, everything else (formatItems, language…)
 * round-trips through unmodified.
 */
export type QualityProfileRecord = Record<string, unknown> & {
  id?: number
  name: string
  upgradeAllowed: boolean
  cutoff: number
  items: QualityProfileItem[]
}
