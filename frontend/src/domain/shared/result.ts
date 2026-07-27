export type Result<T, TError> = { ok: true; value: T } | { ok: false; error: TError }
