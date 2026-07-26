import encryption from '@adonisjs/core/services/encryption'

/**
 * Thin wrapper around Adonis's Encryption service (APP_KEY-backed AES-256-GCM)
 * used by persistence mappers to encrypt secrets (*arr API keys, OIDC client
 * secrets) before they reach the database, and decrypt them on the way out.
 * Never used by the domain — secrets are plain values there (ApiKey VO).
 */
export function encryptSecret(plain: string): string {
  return encryption.encrypt(plain)
}

export function decryptSecret(encrypted: string): string {
  const decrypted = encryption.decrypt<string>(encrypted)
  if (decrypted === null) {
    throw new Error('Failed to decrypt secret — APP_KEY may have changed or the value is corrupted')
  }
  return decrypted
}
