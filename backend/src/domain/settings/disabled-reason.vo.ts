/**
 * Why `ServarrInstance.enabled` is currently `false` — `enabled` alone can't
 * tell "an admin turned this off on purpose" from "the health-check worker
 * disabled it after an outage", and that distinction is exactly what decides
 * whether a later successful check may re-enable it on its own (cf.
 * `ServarrInstance.recordHealthCheck`).
 */
export type DisabledReason = 'admin' | 'health_check'
