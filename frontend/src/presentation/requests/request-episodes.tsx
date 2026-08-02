import { useRequestEpisodes } from '#application/requests/request-episodes.query'
import { Badge } from '#presentation/ui/badge'
import { Skeleton } from '#presentation/ui/skeleton'
import { cn } from '#presentation/shared/utils'
import type { RequestEpisodeState } from '#domain/requests/request-episode'

const STATE_LABEL: Record<RequestEpisodeState, string> = {
  available: 'Downloaded',
  downloading: 'Downloading',
  importing: 'Importing',
  missing: 'Missing',
  failed: 'Failed',
}

const STATE_VARIANT: Record<
  RequestEpisodeState,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  available: 'default',
  downloading: 'secondary',
  importing: 'secondary',
  missing: 'outline',
  failed: 'destructive',
}

function episodeCode(seasonNumber: number, episodeNumber: number): string {
  return `S${String(seasonNumber).padStart(2, '0')}E${String(episodeNumber).padStart(2, '0')}`
}

/**
 * Rendered only once the accordion is open — the `enabled` flag is what keeps
 * a list of 50 requests from firing 50 *arr round-trips
 * (cf. docs/phase-6-fiabilite-requests, chantier 5 décision 1).
 */
export function RequestEpisodes({ requestId, open }: { requestId: string; open: boolean }) {
  const episodes = useRequestEpisodes(requestId, open)

  if (episodes.isLoading) {
    return (
      <div className="space-y-1.5">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-8 w-full" />
        ))}
      </div>
    )
  }

  if (episodes.isError || !episodes.data) {
    return <p className="text-xs text-destructive">Could not load the episode list.</p>
  }

  if (!episodes.data.ok) {
    return <p className="text-xs text-destructive">{episodes.data.error.message}</p>
  }

  if (episodes.data.value.length === 0) {
    return <p className="text-xs text-muted-foreground">No episode reported by this instance.</p>
  }

  return (
    <ul className="space-y-1">
      {episodes.data.value.map((episode) => (
        <li
          key={`${episode.seasonNumber}-${episode.episodeNumber}`}
          className="flex items-center gap-2 rounded-md px-2 py-1 text-xs odd:bg-muted/40"
        >
          <span className="w-14 shrink-0 font-mono text-muted-foreground tabular-nums">
            {episodeCode(episode.seasonNumber, episode.episodeNumber)}
          </span>
          <span className={cn('min-w-0 flex-1 truncate', episode.state === 'missing' && 'text-muted-foreground')}>
            {episode.title}
          </span>
          {episode.percentage !== null ? (
            <span className="shrink-0 text-muted-foreground tabular-nums">
              {episode.percentage}%
            </span>
          ) : null}
          <Badge variant={STATE_VARIANT[episode.state]} className="shrink-0 text-[10px]">
            {STATE_LABEL[episode.state]}
          </Badge>
        </li>
      ))}
    </ul>
  )
}
