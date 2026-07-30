import { Input } from '#presentation/ui/input'
import { Label } from '#presentation/ui/label'
import { Switch } from '#presentation/ui/switch'
import { Textarea } from '#presentation/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#presentation/ui/select'
import type { ServarrField } from '#domain/settings/servarr-field'

const KNOWN_TYPES = new Set(['textbox', 'path', 'number', 'checkbox', 'select', 'password', 'tag'])

function isSensitive(field: ServarrField): boolean {
  return field.type === 'password' || field.privacy === 'password' || field.privacy === 'apiKey'
}

/**
 * Renders one control per `ServarrField`, generically — download clients and
 * indexers each have dozens of possible implementations with different
 * `fields[]` shapes, so this can't be hand-typed like the quality profile
 * form (cf. docs/phase-4-download-clients-indexers decision 2). Exotic
 * field types (`seedCriteria`, `device`, OAuth…) fall back to a raw,
 * unvalidated JSON textarea — a known MVP limitation.
 */
export function DynamicFieldsForm({
  fields,
  onChange,
}: {
  fields: ServarrField[]
  onChange: (fields: ServarrField[]) => void
}) {
  function updateField(name: string, value: unknown) {
    onChange(fields.map((field) => (field.name === name ? { ...field, value } : field)))
  }

  return (
    <div className="space-y-4">
      {fields.map((field) => {
        const label = field.label ?? field.name

        if (field.type === 'checkbox') {
          return (
            <div key={field.name} className="flex items-center gap-2">
              <Switch
                checked={Boolean(field.value)}
                onCheckedChange={(checked) => updateField(field.name, checked)}
              />
              <Label>{label}</Label>
            </div>
          )
        }

        if (field.type === 'select' && field.selectOptions) {
          return (
            <div key={field.name} className="space-y-2">
              <Label>{label}</Label>
              <Select
                value={field.value !== undefined ? String(field.value) : undefined}
                onValueChange={(value) => updateField(field.name, value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={`Select ${label.toLowerCase()}`} />
                </SelectTrigger>
                <SelectContent>
                  {field.selectOptions.map((option) => (
                    <SelectItem key={String(option.value)} value={String(option.value)}>
                      {option.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {field.helpText ? (
                <p className="text-xs text-muted-foreground">{field.helpText}</p>
              ) : null}
            </div>
          )
        }

        if (field.type === 'tag') {
          const raw = Array.isArray(field.value)
            ? field.value.join(', ')
            : String(field.value ?? '')
          return (
            <div key={field.name} className="space-y-2">
              <Label>{label}</Label>
              <Input
                value={raw}
                placeholder="Comma-separated"
                onChange={(event) => {
                  const tokens = event.target.value
                    .split(',')
                    .map((token) => token.trim())
                    .filter((token) => token !== '')
                  updateField(
                    field.name,
                    tokens.map((token) => (Number.isNaN(Number(token)) ? token : Number(token))),
                  )
                }}
              />
              {field.helpText ? (
                <p className="text-xs text-muted-foreground">{field.helpText}</p>
              ) : null}
            </div>
          )
        }

        if (field.type !== undefined && !KNOWN_TYPES.has(field.type)) {
          return (
            <div key={field.name} className="space-y-2">
              <Label>
                {label} <span className="text-xs text-muted-foreground">(raw JSON)</span>
              </Label>
              <Textarea
                defaultValue={JSON.stringify(field.value ?? null)}
                onChange={(event) => {
                  try {
                    updateField(field.name, JSON.parse(event.target.value))
                  } catch {
                    // Invalid JSON mid-edit — ignored until it parses again (known MVP limitation).
                  }
                }}
              />
            </div>
          )
        }

        return (
          <div key={field.name} className="space-y-2">
            <Label>{label}</Label>
            <Input
              type={isSensitive(field) ? 'password' : field.type === 'number' ? 'number' : 'text'}
              value={field.value === undefined || field.value === null ? '' : String(field.value)}
              onChange={(event) => {
                if (field.type !== 'number') return updateField(field.name, event.target.value)
                const raw = event.target.value
                const parsed = raw === '' ? undefined : Number(raw)
                updateField(field.name, parsed === undefined || Number.isNaN(parsed) ? undefined : parsed)
              }}
            />
            {field.helpText ? (
              <p className="text-xs text-muted-foreground">{field.helpText}</p>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
