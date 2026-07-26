import { ServarrCircuitOpenError, ServarrHttpError } from './base-servarr-client.js'
import type { ConnectionError } from '#domain/settings/connection-error.vo'
import type { ProvisioningError } from '#domain/requests/provisioning-error.vo'

/** Maps a thrown error from BaseServarrClient (or Zod) into a domain ConnectionError. */
export function classifyConnectionError(error: unknown): ConnectionError {
  if (error instanceof ServarrCircuitOpenError) {
    return { type: 'unexpected_response', message: error.message }
  }

  if (error instanceof ServarrHttpError) {
    if (error.status === 401 || error.status === 403) {
      return { type: 'unauthorized', message: 'The instance rejected the API key' }
    }
    return { type: 'unexpected_response', message: error.message }
  }

  if (error instanceof DOMException && error.name === 'AbortError') {
    return { type: 'timeout', message: 'The instance did not respond in time' }
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

export function apiPathPrefix(kind: 'radarr' | 'sonarr' | 'lidarr'): '/api/v3' | '/api/v1' {
  return kind === 'lidarr' ? '/api/v1' : '/api/v3'
}

/** Maps a thrown error from BaseServarrClient (or Zod) into a domain ProvisioningError. */
export function classifyProvisioningError(error: unknown): ProvisioningError {
  if (error instanceof ServarrHttpError) {
    if (error.status === 400 || error.status === 409) {
      return { type: 'already_exists', message: 'This title already exists in the *arr instance' }
    }
    if (error.status && error.status >= 500) {
      return { type: 'instance_unavailable', message: error.message }
    }
    return { type: 'validation_failed', message: error.message }
  }

  if (error instanceof ServarrCircuitOpenError) {
    return { type: 'instance_unavailable', message: error.message }
  }

  if (error instanceof DOMException && error.name === 'AbortError') {
    return { type: 'instance_unavailable', message: 'The instance did not respond in time' }
  }

  return { type: 'unknown', message: error instanceof Error ? error.message : String(error) }
}
