import type { ValidationError } from '#domain/shared/validation-error'
import type { InvalidTransition } from '#domain/shared/invalid-transition'

export interface SerializedError {
  status: number
  body: { code: string; message: string }
}

const STRING_ERROR_STATUS: Record<string, number> = {
  invalid_email: 422,
  admin_already_exists: 409,
  email_already_used: 409,
  weak_password: 422,
  invalid_credentials: 401,
  account_disabled: 403,
  not_found: 404,
  instance_not_found: 404,
  already_requested: 409,
  already_managed: 409,
  no_active_instance: 409,
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
  already_requested: 'This media has already been requested.',
  already_managed: 'This media is already managed by an active request.',
  no_active_instance: 'No active instance is configured for this media kind.',
}

const TYPED_ERROR_STATUS: Record<string, number> = {
  // ConnectionError (settings context)
  dns: 502,
  connection_refused: 502,
  timeout: 502,
  unauthorized: 502,
  unexpected_response: 502,
  // ProvisioningError (requests context)
  already_exists: 409,
  instance_unavailable: 502,
  validation_failed: 422,
  unknown: 500,
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
 */
export function serializeError(error: unknown): SerializedError {
  if (isValidationError(error)) {
    return { status: 422, body: { code: 'validation_failed', message: error.message } }
  }

  if (isInvalidTransition(error)) {
    return {
      status: 409,
      body: {
        code: 'invalid_transition',
        message: `This action is not allowed from the current state ("${error.from}" -> "${error.to}").`,
      },
    }
  }

  if (isTypedError(error)) {
    return {
      status: TYPED_ERROR_STATUS[error.type] ?? 500,
      body: { code: error.type, message: error.message },
    }
  }

  if (typeof error === 'string') {
    return {
      status: STRING_ERROR_STATUS[error] ?? 400,
      body: { code: error, message: STRING_ERROR_MESSAGES[error] ?? error },
    }
  }

  throw new Error(`serializeError: unrecognized domain error shape: ${JSON.stringify(error)}`)
}
