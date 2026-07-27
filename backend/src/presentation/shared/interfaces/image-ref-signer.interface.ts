/**
 * Turns a raw remote poster/artwork URL into an opaque, signed reference the
 * browser can pass to `GET /api/images?ref=...` — never the raw URL itself,
 * cf. docs/adr/0008-signature-proxy-images.md. Bound to
 * `infrastructure/images/image-ref-signer.ts` by a provider, since
 * presentation must not import infrastructure directly.
 */
export interface ImageRefSigner {
  sign(remoteUrl: string): string
}
