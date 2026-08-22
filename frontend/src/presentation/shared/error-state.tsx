import { AlertTriangle } from 'lucide-react'
import { Button } from '#presentation/ui/button'

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-none border border-destructive/30 bg-destructive/5 py-16 text-center">
      <AlertTriangle className="size-6 text-destructive" />
      <p className="max-w-sm text-sm text-destructive">{message}</p>
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Retry
        </Button>
      ) : null}
    </div>
  )
}
