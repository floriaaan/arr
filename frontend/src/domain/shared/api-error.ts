/**
 * Mirrors the backend's error envelope (`{ error: { type, message, details? } }`,
 * cf. docs/phase-0/04-endpoints-http.md) plus the HTTP status it came with.
 * Lives in `domain` (not `infrastructure`) because `ArrConnector` — a domain
 * interface — returns it; `HttpArrConnector` builds one from a `Response`,
 * `FakeArrConnector` builds one by hand for its simulated failure scenarios.
 */
export interface ApiError {
  type: string
  message: string
  details?: unknown
  status: number
}
