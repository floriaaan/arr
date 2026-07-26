import { encryptSecret, decryptSecret } from '#infrastructure/shared/encryption'

/**
 * Signs a remote image URL into an opaque ref for /api/images?ref=..., and
 * verifies one back — cf. docs/adr/0008-signature-proxy-images.md. Reuses
 * Adonis's AES-256-GCM encryption (authenticated, so tampering is detected)
 * rather than hand-rolled HMAC: same guarantee, one less primitive to get
 * right, and the remote URL stays opaque to the browser as a side effect.
 *
 * Presentation controllers need this to serialize MediaItem.posterRef, but
 * presentation must never import infrastructure directly (cf.
 * docs/adr/0002) — Phase 4 exposes it there through a presentation-owned
 * port (e.g. presentation/shared/interfaces/image-ref-signer.interface.ts)
 * that a provider binds to this implementation, the same way every other
 * port in this codebase is wired.
 */
const SIGNATURE_TTL_MS = 24 * 60 * 60 * 1000

interface SignedRefPayload {
  url: string
  exp: number
}

export function signImageRef(remoteUrl: string, now: Date = new Date()): string {
  const payload: SignedRefPayload = { url: remoteUrl, exp: now.getTime() + SIGNATURE_TTL_MS }
  return encryptSecret(JSON.stringify(payload))
}

export function verifyImageRef(ref: string, now: Date = new Date()): string | null {
  try {
    const payload = JSON.parse(decryptSecret(ref)) as Partial<SignedRefPayload>
    if (typeof payload.url !== 'string' || typeof payload.exp !== 'number') return null
    if (now.getTime() > payload.exp) return null
    return payload.url
  } catch {
    return null
  }
}
