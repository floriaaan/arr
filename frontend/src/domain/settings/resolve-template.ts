import type { ServarrKind } from './servarr-instance'
import type { ServarrField } from './servarr-field'

const TEMPLATE_TOKEN = '{{arr}}'

function resolveValue(value: unknown, kind: ServarrKind): unknown {
  if (typeof value === 'string') return value.replaceAll(TEMPLATE_TOKEN, kind)
  if (Array.isArray(value)) return value.map((item) => resolveValue(item, kind))
  return value
}

/**
 * Resolves `{{arr}}` placeholders in field values to the target instance's
 * kind (e.g. `"{{arr}}-media"` -> `"radarr-media"` when applied to Radarr).
 * Lets one shared form value still vary sensibly per instance in the
 * grouped edit/create dialog, without the fields[] literal value having to
 * be identical everywhere. Never applied to `name`/`implementation`/
 * `protocol` — those feed `computeMergeKey` (cf. merge-servarr-records.ts),
 * and templating them would stop the record from merging back into the
 * same card next time it's fetched.
 */
export function resolveFieldsTemplate(fields: ServarrField[], kind: ServarrKind): ServarrField[] {
  return fields.map((field) => ({ ...field, value: resolveValue(field.value, kind) }))
}
