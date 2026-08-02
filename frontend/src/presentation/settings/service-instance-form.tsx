import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2, PlugZap, Save, Trash2 } from 'lucide-react'
import { useTestInstance } from '#application/settings/test-instance.mutation'
import { useFetchInstanceProfiles } from '#application/settings/fetch-instance-profiles.mutation'
import { useSaveInstance } from '#application/settings/save-instance.mutation'
import { Input } from '#presentation/ui/input'
import { Label } from '#presentation/ui/label'
import { Button } from '#presentation/ui/button'
import { DiscoveryDialog } from './discovery-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#presentation/ui/select'
import type { ServarrKind, ServarrInstanceDto } from '#domain/settings/servarr-instance'
import type { InstanceProfiles } from '#domain/interfaces/arr-connector'

export function ServiceInstanceForm({
  kind,
  existing,
  duringOnboarding,
  onSaved,
  onRemove,
}: {
  kind: ServarrKind
  existing?: ServarrInstanceDto
  duringOnboarding: boolean
  onSaved?: (instance: ServarrInstanceDto) => void
  onRemove?: () => void
}) {
  const [baseUrl, setBaseUrl] = useState(existing?.baseUrl ?? '')
  const [apiKey, setApiKey] = useState('')
  const [profiles, setProfiles] = useState<InstanceProfiles | null>(null)
  const [rootFolderPath, setRootFolderPath] = useState(existing?.rootFolderPath ?? '')
  const [qualityProfileId, setQualityProfileId] = useState(existing?.qualityProfileId ?? undefined)
  const [metadataProfileId, setMetadataProfileId] = useState(
    existing?.metadataProfileId ?? undefined,
  )
  const [languageProfileId, setLanguageProfileId] = useState(
    existing?.languageProfileId ?? undefined,
  )

  const testInstance = useTestInstance()
  const fetchProfiles = useFetchInstanceProfiles()
  const saveInstance = useSaveInstance()

  function handleTest() {
    testInstance.mutate(
      { kind, baseUrl, apiKey, duringOnboarding },
      {
        onSuccess: (result) => {
          if (!result.ok) return toast.error(result.error.message)
          toast.success(`Connected — ${result.detectedVersion}`)
          fetchProfiles.mutate(
            { kind, baseUrl, apiKey, duringOnboarding },
            {
              onSuccess: (profilesResult) => profilesResult.ok && setProfiles(profilesResult.value),
            },
          )
        },
      },
    )
  }

  function handleSave() {
    saveInstance.mutate(
      {
        kind,
        duringOnboarding,
        draft: {
          baseUrl,
          apiKey,
          rootFolderPath,
          qualityProfileId: qualityProfileId ?? 0,
          metadataProfileId,
          languageProfileId,
          enabled: true,
        },
      },
      {
        onSuccess: (result) => {
          if (!result.ok) return toast.error(result.error.message)
          toast.success(`${kind} saved.`)
          onSaved?.(result.value)
        },
      },
    )
  }

  const canSave = rootFolderPath !== '' && qualityProfileId !== undefined

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Base URL</Label>
        <div className="flex gap-2">
          <Input
            className="flex-1"
            placeholder="http://localhost:7878"
            value={baseUrl}
            onChange={(event) => setBaseUrl(event.target.value)}
          />
          <DiscoveryDialog
            kind={kind}
            duringOnboarding={duringOnboarding}
            onPick={setBaseUrl}
            triggerClassName="h-9"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>API key</Label>
        <Input
          type="password"
          placeholder={existing?.hasApiKey ? 'Re-enter to change' : ''}
          value={apiKey}
          onChange={(event) => setApiKey(event.target.value)}
        />
      </div>

      {profiles ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Root folder</Label>
              <Select value={rootFolderPath} onValueChange={setRootFolderPath}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a root folder" />
                </SelectTrigger>
                <SelectContent>
                  {profiles.rootFolders.map((folder) => (
                    <SelectItem key={folder.path} value={folder.path}>
                      {folder.path}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Quality profile</Label>
              <Select
                value={qualityProfileId?.toString()}
                onValueChange={(value) => setQualityProfileId(Number(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a quality profile" />
                </SelectTrigger>
                <SelectContent>
                  {profiles.qualityProfiles.map((profile) => (
                    <SelectItem key={profile.id} value={profile.id.toString()}>
                      {profile.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {kind === 'lidarr' && profiles.metadataProfiles ? (
            <div className="space-y-2">
              <Label>Metadata profile</Label>
              <Select
                value={metadataProfileId?.toString()}
                onValueChange={(value) => setMetadataProfileId(Number(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a metadata profile" />
                </SelectTrigger>
                <SelectContent>
                  {profiles.metadataProfiles.map((profile) => (
                    <SelectItem key={profile.id} value={profile.id.toString()}>
                      {profile.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {kind === 'sonarr' && profiles.languageProfiles ? (
            <div className="space-y-2">
              <Label>Language profile</Label>
              <Select
                value={languageProfileId?.toString()}
                onValueChange={(value) => setLanguageProfileId(Number(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a language profile" />
                </SelectTrigger>
                <SelectContent>
                  {profiles.languageProfiles.map((profile) => (
                    <SelectItem key={profile.id} value={profile.id.toString()}>
                      {profile.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={handleTest}
          disabled={!baseUrl || !apiKey || testInstance.isPending}
        >
          {testInstance.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <PlugZap className="size-4" />
          )}
          {testInstance.isPending ? 'Testing…' : 'Test connection'}
        </Button>
        <Button onClick={handleSave} disabled={!canSave || saveInstance.isPending}>
          {saveInstance.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          {saveInstance.isPending ? 'Saving…' : 'Save'}
        </Button>
        {onRemove ? (
          <Button type="button" variant="destructive" onClick={onRemove}>
            <Trash2 className="size-4" />
            Remove
          </Button>
        ) : null}
      </div>
    </div>
  )
}
