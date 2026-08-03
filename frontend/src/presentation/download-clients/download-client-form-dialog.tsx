import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2, Save, PlugZap } from 'lucide-react'
import { useDownloadClientSchema } from '#application/settings/download-client-schema.query'
import { useCreateDownloadClient } from '#application/settings/create-download-client.mutation'
import { useUpdateDownloadClient } from '#application/settings/update-download-client.mutation'
import { useTestDownloadClient } from '#application/settings/test-download-client.mutation'
import { diffFields, applyDiff } from '#domain/settings/diff-servarr-record'
import { resolveFieldsTemplate } from '#domain/settings/resolve-template'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '#presentation/ui/dialog'
import { Input } from '#presentation/ui/input'
import { Label } from '#presentation/ui/label'
import { Button } from '#presentation/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#presentation/ui/select'
import { DynamicFieldsForm } from '#presentation/shared/dynamic-fields-form'
import type { KindMeta } from '#presentation/shared/merged-record-card'
import type { ServarrKind } from '#domain/settings/servarr-instance'
import type { DownloadClientRecord } from '#domain/settings/download-client-record'
import type { MergedRecord } from '#domain/settings/merge-servarr-records'

export type DownloadClientFormMode =
  | { type: 'add' }
  | { type: 'edit-group'; merged: MergedRecord<DownloadClientRecord> }
  | { type: 'edit-instance'; kind: ServarrKind; record: DownloadClientRecord }

function invalidate(queryClient: ReturnType<typeof useQueryClient>, kind: ServarrKind) {
  void queryClient.invalidateQueries({ queryKey: ['download-clients', kind] })
}

export function DownloadClientFormDialog({
  open,
  onOpenChange,
  configuredKinds,
  kindMeta,
  mode,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  configuredKinds: ServarrKind[]
  kindMeta: Record<ServarrKind, KindMeta>
  mode: DownloadClientFormMode
}) {
  const queryClient = useQueryClient()
  const referenceKind = configuredKinds[0] ?? 'radarr'
  const schema = useDownloadClientSchema(referenceKind, open && mode.type === 'add')
  const createMutation = useCreateDownloadClient()
  const updateMutation = useUpdateDownloadClient()
  const testMutation = useTestDownloadClient()

  const groupKindsPresent =
    mode.type === 'edit-group' ? mode.merged.perInstance.map(({ kind }) => kind) : []

  const [record, setRecord] = useState<DownloadClientRecord | null>(
    mode.type === 'edit-group'
      ? mode.merged.perInstance[0]!.record
      : mode.type === 'edit-instance'
        ? mode.record
        : null,
  )
  const [targetKinds, setTargetKinds] = useState<Set<ServarrKind>>(
    () =>
      new Set(
        mode.type === 'edit-group' ? groupKindsPresent : mode.type === 'add' ? configuredKinds : [],
      ),
  )
  const [pending, setPending] = useState(false)

  const showTargetPicker = mode.type !== 'edit-instance'
  const title =
    mode.type === 'add'
      ? 'Add download client'
      : mode.type === 'edit-group'
        ? `Edit ${mode.merged.name}`
        : `Edit ${mode.record.name} on ${kindMeta[mode.kind].label}`

  function toggleTarget(kind: ServarrKind) {
    setTargetKinds((current) => {
      const next = new Set(current)
      if (next.has(kind)) next.delete(kind)
      else next.add(kind)
      return next
    })
  }

  function selectImplementation(implementation: string) {
    if (!schema.data?.ok) return
    const template = schema.data.value.find(
      (candidate) => candidate.implementation === implementation,
    )
    if (template) setRecord(template)
  }

  async function handleSave() {
    if (!record) return
    if (record.name.trim() === '') return toast.error('Name is required.')

    setPending(true)
    try {
      if (mode.type === 'edit-instance') {
        const result = await updateMutation.mutateAsync({
          kind: mode.kind,
          id: mode.record.id!,
          payload: { ...record, fields: resolveFieldsTemplate(record.fields, mode.kind) },
        })
        if (!result.ok) {
          toast.error(`${kindMeta[mode.kind].label}: ${result.error.message}`)
          return
        }
        invalidate(queryClient, mode.kind)
        toast.success(`${record.name} saved on ${kindMeta[mode.kind].label}.`)
        onOpenChange(false)
        return
      }

      const reference = mode.type === 'edit-group' ? mode.merged.perInstance[0]!.record : record
      const existingByKind =
        mode.type === 'edit-group'
          ? new Map(mode.merged.perInstance.map(({ kind, record: r }) => [kind, r]))
          : new Map<ServarrKind, DownloadClientRecord>()

      const results = await Promise.all(
        [...targetKinds].map(async (kind) => {
          const existing = existingByKind.get(kind)
          if (existing) {
            const diff = diffFields(reference, record)
            const applied = applyDiff(existing, diff)
            const payload = { ...applied, fields: resolveFieldsTemplate(applied.fields, kind) }
            const result = await updateMutation.mutateAsync({ kind, id: existing.id!, payload })
            return { kind, result }
          }
          const payload = { ...record, fields: resolveFieldsTemplate(record.fields, kind) }
          const result = await createMutation.mutateAsync({ kind, payload })
          return { kind, result }
        }),
      )

      let hasError = false
      for (const { kind, result } of results) {
        invalidate(queryClient, kind)
        if (!result.ok) {
          hasError = true
          toast.error(`${kindMeta[kind].label}: ${result.error.message}`)
        }
      }
      if (!hasError) {
        toast.success(`${record.name} saved.`)
        onOpenChange(false)
      }
    } finally {
      setPending(false)
    }
  }

  async function handleTest() {
    if (!record) return
    const kinds = mode.type === 'edit-instance' ? [mode.kind] : [...targetKinds]
    if (kinds.length === 0) return toast.error('Select at least one instance to test against.')

    for (const kind of kinds) {
      const payload = { ...record, fields: resolveFieldsTemplate(record.fields, kind) }
      const result = await testMutation.mutateAsync({ kind, payload })
      if (result.ok) toast.success(`${kindMeta[kind].label}: connection OK.`)
      else toast.error(`${kindMeta[kind].label}: ${result.error.message}`)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Creates or edits a real download client on the target *arr instance(s).
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
          {mode.type === 'add' && !record ? (
            schema.isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Loading available implementations…
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Implementation</Label>
                <Select onValueChange={selectImplementation}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose an implementation" />
                  </SelectTrigger>
                  <SelectContent>
                    {(schema.data?.ok ? schema.data.value : []).map((template) => (
                      <SelectItem key={template.implementation} value={template.implementation}>
                        {template.implementationName ?? template.implementation} (
                        {template.protocol})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )
          ) : null}

          {record ? (
            <>
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={record.name}
                  onChange={(event) => setRecord({ ...record, name: event.target.value })}
                />
              </div>

              <DynamicFieldsForm
                fields={record.fields}
                onChange={(fields) => setRecord({ ...record, fields })}
              />

              <p className="text-xs text-muted-foreground">
                Tip: use <code className="rounded bg-muted px-1 py-0.5">{'{{arr}}'}</code> in a text
                field (e.g. category) to insert the target instance automatically — resolves to{' '}
                <code className="rounded bg-muted px-1 py-0.5">radarr</code>,{' '}
                <code className="rounded bg-muted px-1 py-0.5">sonarr</code> or{' '}
                <code className="rounded bg-muted px-1 py-0.5">lidarr</code> per instance.
              </p>

              {showTargetPicker ? (
                <div className="space-y-2">
                  <Label>Apply to</Label>
                  <div className="space-y-1 rounded-md border p-2">
                    {configuredKinds.map((kind) => (
                      <label
                        key={kind}
                        className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent"
                      >
                        <input
                          type="checkbox"
                          className="size-4"
                          checked={targetKinds.has(kind)}
                          onChange={() => toggleTarget(kind)}
                        />
                        {kindMeta[kind].label}
                        {!groupKindsPresent.includes(kind) && mode.type === 'edit-group' ? (
                          <span className="text-xs text-muted-foreground">
                            (not configured yet)
                          </span>
                        ) : null}
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Only fields you change are applied to instances that already have this client —
                    other per-instance settings (e.g. category) are left untouched.
                  </p>
                </div>
              ) : null}
            </>
          ) : null}
        </div>

        <DialogFooter className="shrink-0">
          <Button
            variant="outline"
            onClick={handleTest}
            disabled={!record || testMutation.isPending}
          >
            {testMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <PlugZap className="size-4" />
            )}
            Test
          </Button>
          <Button onClick={handleSave} disabled={!record || pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            {pending ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
