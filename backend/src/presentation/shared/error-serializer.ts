import type { ValidationError } from '#domain/shared/validation-error'
import type { InvalidTransition } from '#domain/shared/invalid-transition'

/**
 * Matches the envelope documented in docs/phase-0/04-endpoints-http.md:
 * `{ error: { type, message, details? } }`, with status codes restricted to
 * the set listed there (400 validation, 401 unauthenticated, 403 forbidden,
 * 404, 409 state conflict, 502 upstream *arr instance unreachable).
 */
export interface SerializedError {
  status: number
  body: { error: { type: string; message: string; details?: unknown } }
}

const STRING_ERROR_STATUS: Record<string, number> = {
  invalid_email: 400,
  admin_already_exists: 409,
  email_already_used: 409,
  weak_password: 400,
  invalid_credentials: 401,
  account_disabled: 403,
  not_found: 404,
  instance_not_found: 404,
  profile_not_found: 404,
  default_profile_delete_forbidden: 409,
  already_requested: 409,
  already_managed: 409,
  no_active_instance: 409,
  invalid_id: 400,
}

const STRING_ERROR_MESSAGES: Record<string, string> = {
  invalid_email: 'The provided email address is not valid.',
  admin_already_exists: 'An admin account already exists.',
  email_already_used: 'This email address is already in use.',
  weak_password: 'The provided password does not meet the minimum requirements.',
  invalid_credentials: 'Invalid email or password.',
  account_disabled: 'This account has been disabled.',
  not_found: 'The requested resource was not found.',
  instance_not_found: 'The requested Servarr instance was not found.',
  profile_not_found: 'The requested instance profile was not found.',
  default_profile_delete_forbidden:
    'The default profile cannot be deleted. Set another profile as default first.',
  already_requested: 'This media has already been requested.',
  already_managed: 'This media is already managed by an active request.',
  no_active_instance: 'No active instance is configured for this media kind.',
  invalid_id: 'The provided id is not a valid number.',
}

const TYPED_ERROR_STATUS: Record<string, number> = {
  // ConnectionError (settings context) — the *arr instance itself is unreachable/misbehaving
  dns: 502,
  connection_refused: 502,
  timeout: 502,
  unauthorized: 502,
  unexpected_response: 502,
  // ProvisioningError (requests context)
  already_exists: 409,
  instance_unavailable: 502,
  validation_failed: 400,
  unknown: 502,
}

function isValidationError(error: unknown): error is ValidationError {
  return typeof error === 'object' && error !== null && 'field' in error && 'message' in error
}

function isInvalidTransition(error: unknown): error is InvalidTransition {
  return typeof error === 'object' && error !== null && 'from' in error && 'to' in error
}

function isTypedError(error: unknown): error is { type: string; message: string } {
  return typeof error === 'object' && error !== null && 'type' in error && 'message' in error
}

/**
 * Converts a domain/application `Result.err(...)` value into an HTTP status
 * + JSON body. Every error union under `src/application/**` resolves to one
 * of the four shapes handled below (a string code, `ValidationError`,
 * `InvalidTransition`, or a `{type, message}` VO like `ConnectionError`/
 * `ProvisioningError`) — hitting the final branch means a new error variant
 * was introduced without a mapping here, which controllers should surface
 * loudly rather than silently downgrade to a generic response.
 *
 * Some endpoints document a bespoke `details` shape for a specific error
 * (e.g. `POST /api/requests/:id/cancel` wants `{type: 'not_cancellable',
 * currentStatus}` instead of the generic `invalid_transition` below) — for
 * those, the controller should pattern-match the error itself and only fall
 * back to this function for the shapes it doesn't need to customize.
 */
export function serializeError(error: unknown): SerializedError {
  if (isValidationError(error)) {
    return { status: 400, body: { error: { type: 'validation_failed', message: error.message } } }
  }

  if (isInvalidTransition(error)) {
    return {
      status: 409,
      body: {
        error: {
          type: 'invalid_transition',
          message: `This action is not allowed from the current state ("${error.from}" -> "${error.to}").`,
          details: { from: error.from, to: error.to },
        },
      },
    }
  }

  if (isTypedError(error)) {
    return {
      status: TYPED_ERROR_STATUS[error.type] ?? 502,
      body: { error: { type: error.type, message: error.message } },
    }
  }

  if (typeof error === 'string') {
    return {
      status: STRING_ERROR_STATUS[error] ?? 400,
      body: { error: { type: error, message: STRING_ERROR_MESSAGES[error] ?? error } },
    }
  }

  throw new Error(`serializeError: unrecognized domain error shape: ${JSON.stringify(error)}`)
}
