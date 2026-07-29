import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Link } from '@tanstack/react-router'
import { Clapperboard, Tv, Music, Plus } from 'lucide-react'
import { useInstances } from '#application/settings/instances.query'
import { useIndexers } from '#application/settings/indexers.query'
import { useDeleteIndexer } from '#application/settings/delete-indexer.mutation'
import { mergeByInstance } from '#domain/settings/merge-servarr-records'
import { IndexerFormDialog } from './indexer-form-dialog'
import { MergedRecordCard } from '#presentation/shared/merged-record-card'
import { Card, CardHeader, CardTitle, CardDescription } from '#presentation/ui/card'
import { Button } from '#presentation/ui/button'
import type { ServarrKind } from '#domain/settings/servarr-instance'
import type { IndexerRecord } from '#domain/settings/indexer-record'
import type { KindMeta } from '#presentation/shared/merged-record-card'
import type { MergedRecord } from '#domain/settings/merge-servarr-records'
import type { IndexerFormMode } from './indexer-form-dialog'

const SERVARR_META: Record<ServarrKind, KindMeta> = {
  radarr: { label: 'Radarr', icon: Clapperboard },
  sonarr: { label: 'Sonarr', icon: Tv },
  lidarr: { label: 'Lidarr', icon: Music },
}

const SERVARR_KINDS: readonly ServarrKind[] = ['radarr', 'sonarr', 'lidarr']

function UnconfiguredInstanceCard({ kind }: { kind: ServarrKind }) {
  const meta = SERVARR_META[kind]
  const Icon = meta.icon
  return (
    <Card>
      <CardHeader className="flex-row items-center gap-3 space-y-0">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
          <Icon className="size-4.5" />
        </div>
        <div className="flex-1">
          <CardTitle>{meta.label}</CardTitle>
          <CardDescription>Not connected yet.</CardDescription>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link to="/settings">Connect in Settings</Link>
        </Button>
      </CardHeader>
    </Card>
  )
}

function renderStatus(record: IndexerRecord) {
  const searches = [
    record.enableRss ? 'RSS' : null,
    record.enableAutomaticSearch ? 'Automatic' : null,
    record.enableInteractiveSearch ? 'Interactive' : null,
  ].filter((value): value is string => value !== null)
  return (
    <span className="text-sm text-muted-foreground">
      {searches.length > 0 ? searches.join(', ') : 'Disabled'} · priority {record.priority}
    </span>
  )
}

export function IndexersPage() {
  const instances = useInstances()
  const queryClient = useQueryClient()
  const configuredKinds = SERVARR_KINDS.filter((kind) =>
    instances.data?.some((instance) => instance.kind === kind),
  )

  const radarr = useIndexers('radarr', configuredKinds.includes('radarr'))
  const sonarr = useIndexers('sonarr', configuredKinds.includes('sonarr'))
  const lidarr = useIndexers('lidarr', configuredKinds.includes('lidarr'))
  const byKind = { radarr, sonarr, lidarr } as const

  const deleteMutation = useDeleteIndexer()

  const [demerged, setDemerged] = useState<Set<string>>(new Set())
  const [dialogMode, setDialogMode] = useState<IndexerFormMode | null>(null)

  function toggleDemerge(mergeKey: string) {
    setDemerged((current) => {
      const next = new Set(current)
      if (next.has(mergeKey)) next.delete(mergeKey)
      else next.add(mergeKey)
      return next
    })
  }

  const entries = configuredKinds
    .map((kind) => {
      const query = byKind[kind]
      return query.data?.ok ? { kind, records: query.data.value } : null
    })
    .filter((entry): entry is { kind: ServarrKind; records: IndexerRecord[] } => entry !== null)

  const merged = mergeByInstance(entries)
  const unconfiguredKinds = SERVARR_KINDS.filter((kind) => !configuredKinds.includes(kind))

  function handleDeleteGroup(group: MergedRecord<IndexerRecord>) {
    void Promise.all(
      group.perInstance.map(({ kind, record }) =>
        deleteMutation.mutateAsync({ kind, id: record.id! }).then((result) => {
          void queryClient.invalidateQueries({ queryKey: ['indexers', kind] })
          if (!result.ok) toast.error(`${SERVARR_META[kind].label}: ${result.error.message}`)
        }),
      ),
    ).then(() => toast.success(`${group.name} deleted.`))
  }

  function handleDeleteInstance(kind: ServarrKind, record: IndexerRecord) {
    deleteMutation.mutate(
      { kind, id: record.id! },
      {
        onSuccess: (result) => {
          if (!result.ok) return toast.error(result.error.message)
          void queryClient.invalidateQueries({ queryKey: ['indexers', kind] })
          toast.success(`${record.name} deleted on ${SERVARR_META[kind].label}.`)
        },
      },
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          size="sm"
          onClick={() => setDialogMode({ type: 'add' })}
          disabled={configuredKinds.length === 0}
        >
          <Plus className="size-4" />
          Add indexer
        </Button>
      </div>

      {merged.map((group) => {
        const missingKinds = configuredKinds.filter(
          (kind) => !group.perInstance.some((entry) => entry.kind === kind),
        )
        return (
          <MergedRecordCard
            key={group.mergeKey}
            merged={group}
            kindMeta={SERVARR_META}
            missingKinds={missingKinds}
            demerged={demerged.has(group.mergeKey)}
            onToggleDemerge={() => toggleDemerge(group.mergeKey)}
            renderInstanceStatus={renderStatus}
            onEditGroup={() => setDialogMode({ type: 'edit-group', merged: group })}
            onEditInstance={(kind, record) => setDialogMode({ type: 'edit-instance', kind, record })}
            onDeleteGroup={() => handleDeleteGroup(group)}
            onDeleteInstance={handleDeleteInstance}
          />
        )
      })}

      {merged.length === 0 && configuredKinds.length > 0 ? (
        <p className="text-sm text-muted-foreground">No indexer configured yet.</p>
      ) : null}

      {unconfiguredKinds.map((kind) => (
        <UnconfiguredInstanceCard key={kind} kind={kind} />
      ))}

      {dialogMode ? (
        <IndexerFormDialog
          open
          onOpenChange={(open) => {
            if (!open) setDialogMode(null)
          }}
          configuredKinds={configuredKinds}
          kindMeta={SERVARR_META}
          mode={dialogMode}
        />
      ) : null}
    </div>
  )
}
