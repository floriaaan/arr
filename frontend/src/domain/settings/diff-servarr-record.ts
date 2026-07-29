import type { ServarrField } from './servarr-field'

type FieldedRecord = { fields: ServarrField[] }

function sameValue(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

/**
 * Fields present in `edited` whose value differs from `reference` — used by
 * the grouped edit dialog (cf. docs/phase-4-download-clients-indexers
 * decision 4) so an edit only propagates what the user actually changed,
 * leaving per-instance-only fields (e.g. `category`) untouched elsewhere.
 */
export function diffFields<T extends FieldedRecord>(reference: T, edited: T): Partial<T> {
  const referenceValueByFieldName = new Map(
    reference.fields.map((field) => [field.name, field.value]),
  )
  const changedFields = edited.fields.filter(
    (field) => !sameValue(field.value, referenceValueByFieldName.get(field.name)),
  )

  const diff: Partial<T> = {}
  for (const key of Object.keys(edited) as (keyof T)[]) {
    if (key === 'fields') continue
    if (!sameValue(edited[key], reference[key])) diff[key] = edited[key]
  }
  if (changedFields.length > 0) {
    diff.fields = changedFields
  }

  return diff
}

/**
 * Applies a diff over one instance's own record — fields absent from the
 * diff (or the diff itself) are left exactly as they were on that instance.
 */
export function applyDiff<T extends FieldedRecord>(target: T, diff: Partial<T>): T {
  const { fields: diffFieldsList, ...rest } = diff
  const merged: T = { ...target, ...(rest as Partial<T>) }

  if (diffFieldsList) {
    const diffByName = new Map(diffFieldsList.map((field) => [field.name, field]))
    merged.fields = target.fields.map((field) => diffByName.get(field.name) ?? field)
  }

  return merged
}
