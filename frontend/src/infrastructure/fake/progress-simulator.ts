import type { MediaRequest } from '#domain/requests/media-request'

/**
 * Deterministic, timer-free progress simulation: given how long ago a
 * request was created, compute what stage it *should* be in right now.
 * Every read (`listRequests`/`getRequest`) recomputes from `now` — no
 * `setInterval` state to leak across SSR requests or hot reloads.
 */
const DOWNLOADING_AT_MS = 2_000
const IMPORTING_AT_MS = 12_000
const AVAILABLE_AT_MS = 17_000

export function advanceRequest(request: MediaRequest, now: Date): MediaRequest {
  if (
    request.status !== 'submitted' &&
    request.status !== 'downloading' &&
    request.status !== 'importing'
  ) {
    return request
  }

  const startedAt = new Date(request.createdAt).getTime()
  const elapsed = now.getTime() - startedAt

  if (elapsed >= AVAILABLE_AT_MS) {
    return { ...request, status: 'available', progress: null, updatedAt: now.toISOString() }
  }
  if (elapsed >= IMPORTING_AT_MS) {
    return { ...request, status: 'importing', progress: null, updatedAt: now.toISOString() }
  }
  if (elapsed < DOWNLOADING_AT_MS) {
    return request
  }

  const windowMs = IMPORTING_AT_MS - DOWNLOADING_AT_MS
  const percentage = Math.min(100, Math.round(((elapsed - DOWNLOADING_AT_MS) / windowMs) * 100))
  return {
    ...request,
    status: 'downloading',
    progress: {
      percentage,
      sizeLeftBytes: Math.round((1 - percentage / 100) * 4_000_000_000),
      eta: new Date(startedAt + IMPORTING_AT_MS).toISOString(),
      stepLabel: 'Downloading',
    },
    updatedAt: now.toISOString(),
  }
}
