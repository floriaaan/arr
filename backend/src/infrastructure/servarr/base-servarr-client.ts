export class ServarrHttpError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message)
  }
}

export class ServarrCircuitOpenError extends Error {
  constructor(baseUrl: string) {
    super(`Circuit breaker open for ${baseUrl} — too many recent failures`)
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Per-instance, in-memory — trips after 3 consecutive failures, cools down after 30s. */
class CircuitBreaker {
  private consecutiveFailures = 0
  private openUntil: number | null = null

  constructor(
    private readonly threshold = 3,
    private readonly cooldownMs = 30_000,
  ) {}

  isOpen(): boolean {
    if (this.openUntil === null) return false
    if (Date.now() >= this.openUntil) {
      this.openUntil = null
      this.consecutiveFailures = 0
      return false
    }
    return true
  }

  recordSuccess(): void {
    this.consecutiveFailures = 0
    this.openUntil = null
  }

  recordFailure(): void {
    this.consecutiveFailures += 1
    if (this.consecutiveFailures >= this.threshold) {
      this.openUntil = Date.now() + this.cooldownMs
    }
  }
}

export interface ServarrRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  path: string
  query?: Record<string, string>
  body?: unknown
}

export interface BaseServarrClientOptions {
  timeoutMs?: number
  maxRetries?: number
}

/**
 * Injects X-Api-Key, retries with exponential backoff on 5xx/network errors,
 * and trips a simple per-instance circuit breaker. Returns raw parsed JSON —
 * each adapter is responsible for validating it with its own Zod schema
 * (cf. docs/phase-0's ACL description: "aucun type généré depuis les APIs
 * *arr ne franchit la couche infrastructure" unvalidated).
 */
export class BaseServarrClient {
  private readonly circuitBreaker = new CircuitBreaker()
  private readonly timeoutMs: number
  private readonly maxRetries: number

  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
    options: BaseServarrClientOptions = {},
  ) {
    this.timeoutMs = options.timeoutMs ?? 10_000
    this.maxRetries = options.maxRetries ?? 2
  }

  async request(options: ServarrRequestOptions): Promise<unknown> {
    if (this.circuitBreaker.isOpen()) {
      throw new ServarrCircuitOpenError(this.baseUrl)
    }

    const url = new URL(this.baseUrl.replace(/\/+$/, '') + options.path)
    if (options.query) {
      for (const [key, value] of Object.entries(options.query)) url.searchParams.set(key, value)
    }

    let lastError: unknown
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const result = await this.attempt(url, options)
        this.circuitBreaker.recordSuccess()
        return result
      } catch (error) {
        lastError = error
        if (!this.isRetryable(error) || attempt === this.maxRetries) {
          this.circuitBreaker.recordFailure()
          throw error
        }
        await sleep(2 ** attempt * 250)
      }
    }
    throw lastError
  }

  private async attempt(url: URL, options: ServarrRequestOptions): Promise<unknown> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs)

    try {
      const response = await fetch(url, {
        method: options.method ?? 'GET',
        headers: {
          'X-Api-Key': this.apiKey,
          Accept: 'application/json',
          ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new ServarrHttpError(
          `${options.method ?? 'GET'} ${url.pathname} failed with HTTP ${response.status}`,
          response.status,
        )
      }

      if (response.status === 204) return undefined
      // DELETE endpoints on *arr instances commonly answer 200 with an empty
      // body rather than 204 — `response.json()` throws on that, so read the
      // text first and only parse when there's something to parse.
      const text = await response.text()
      return text.length === 0 ? undefined : JSON.parse(text)
    } finally {
      clearTimeout(timeout)
    }
  }

  private isRetryable(error: unknown): boolean {
    if (error instanceof ServarrHttpError) {
      return error.status !== undefined && error.status >= 500
    }
    return true
  }
}
