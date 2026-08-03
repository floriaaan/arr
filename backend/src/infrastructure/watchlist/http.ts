import type { ConnectionError } from '#domain/settings/connection-error.vo'

export class WatchlistHttpError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message)
  }
}

/** Small fetch wrapper for the watchlist clients — no circuit breaker, unlike `BaseServarrClient`: a sync run happens at most every 15 min, not every few seconds. */
export async function fetchJson(
  url: string,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<unknown> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), init.timeoutMs ?? 10_000)

  try {
    const response = await fetch(url, { ...init, signal: controller.signal })
    if (!response.ok) {
      throw new WatchlistHttpError(
        `${init.method ?? 'GET'} ${url} failed with HTTP ${response.status}`,
        response.status,
      )
    }
    const text = await response.text()
    return text.length === 0 ? undefined : JSON.parse(text)
  } finally {
    clearTimeout(timeout)
  }
}

/** Same DNS/timeout/unauthorized taxonomy as `classifyConnectionError` for the *arr clients, kept separate since the thrown error types differ. */
export function classifyWatchlistError(error: unknown): ConnectionError {
  if (error instanceof WatchlistHttpError) {
    if (error.status === 401 || error.status === 403) {
      return { type: 'unauthorized', message: 'The server rejected the credentials/token' }
    }
    return { type: 'unexpected_response', message: error.message }
  }

  if (error instanceof DOMException && error.name === 'AbortError') {
    return { type: 'timeout', message: 'The server did not respond in time' }
  }

  if (error instanceof Error) {
    const cause = (error as { cause?: { code?: string } }).cause
    if (cause?.code === 'ENOTFOUND' || cause?.code === 'EAI_AGAIN') {
      return { type: 'dns', message: error.message }
    }
    if (cause?.code === 'ECONNREFUSED') {
      return { type: 'connection_refused', message: error.message }
    }
    return { type: 'unexpected_response', message: error.message }
  }

  return { type: 'unexpected_response', message: String(error) }
}
