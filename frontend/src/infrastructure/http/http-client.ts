import { errorEnvelopeSchema } from './schemas/error.schema'
import type { ApiError } from '#domain/shared/api-error'

/**
 * Same-origin, relative paths in the browser (cf. docs/phase-1 decision 4:
 * the frontend dev/prod server proxies `/api/*` to the backend) — no CORS,
 * no `credentials` override needed. Server-side (SSR loaders, server
 * functions), `fetch` runs directly in the Node process with no incoming
 * request to piggyback on, so a relative path has no base to resolve
 * against and throws ("Failed to parse URL from /api/..."). There, prefix
 * with the backend's own base URL instead. Plain `typeof window` check
 * rather than `createIsomorphicFn`: that helper only splits correctly once
 * bundled by the TanStack Start Vite plugin, which the Vitest config
 * doesn't run, so it'd always resolve to the server branch in tests too.
 */
function resolveBaseUrl(): string {
  if (typeof window !== 'undefined') return ''
  return process.env.BACKEND_URL ?? 'http://localhost:3333'
}

/**
 * `cookieHeader` is only ever set server-side, where `fetch` has no access
 * to the incoming request's cookie jar (decision 3).
 */
export class HttpClient {
  constructor(private readonly cookieHeader?: string) {}

  private async send(path: string, init: RequestInit): Promise<Response> {
    const headers = new Headers(init.headers)
    if (this.cookieHeader) headers.set('cookie', this.cookieHeader)
    if (init.body !== undefined) headers.set('content-type', 'application/json')

    return fetch(`${resolveBaseUrl()}${path}`, { ...init, headers })
  }

  async get(path: string): Promise<Response> {
    return this.send(path, { method: 'GET' })
  }

  async post(path: string, body?: unknown): Promise<Response> {
    return this.send(path, {
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  }

  async put(path: string, body: unknown): Promise<Response> {
    return this.send(path, { method: 'PUT', body: JSON.stringify(body) })
  }

  async delete(path: string): Promise<Response> {
    return this.send(path, { method: 'DELETE' })
  }
}

export async function toApiError(response: Response): Promise<ApiError> {
  const body: unknown = await response.json().catch(() => null)
  const parsed = errorEnvelopeSchema.safeParse(body)
  if (parsed.success) {
    return { ...parsed.data.error, status: response.status }
  }
  return {
    type: 'unknown',
    message: `Unexpected response (${response.status})`,
    status: response.status,
  }
}
