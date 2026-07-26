import { verifyImageRef } from './image-ref-signer.js'
import { isAllowedImageHost } from './domain-allowlist.js'
import type { DiskImageCache } from './disk-image-cache.js'
import type { ServarrInstanceRepository } from '#domain/settings/interfaces/servarr-instance-repository.interface'

export type ImageProxyResult =
  | { ok: true; buffer: Buffer; contentType: string }
  | { ok: false; reason: 'invalid_ref' | 'forbidden_host' | 'fetch_failed' }

export class ImageProxyService {
  constructor(
    private readonly cache: DiskImageCache,
    private readonly instanceRepository: ServarrInstanceRepository,
  ) {}

  async serve(ref: string): Promise<ImageProxyResult> {
    const remoteUrl = verifyImageRef(ref)
    if (!remoteUrl) return { ok: false, reason: 'invalid_ref' }

    const extraHosts = await this.instanceHosts()
    if (!isAllowedImageHost(remoteUrl, extraHosts)) return { ok: false, reason: 'forbidden_host' }

    const cached = await this.cache.get(remoteUrl)
    if (cached) return { ok: true, buffer: cached.buffer, contentType: cached.contentType }

    try {
      const response = await fetch(remoteUrl)
      if (!response.ok) return { ok: false, reason: 'fetch_failed' }

      const contentType = response.headers.get('content-type') ?? 'application/octet-stream'
      const buffer = Buffer.from(await response.arrayBuffer())
      await this.cache.set(remoteUrl, { buffer, contentType })
      return { ok: true, buffer, contentType }
    } catch {
      return { ok: false, reason: 'fetch_failed' }
    }
  }

  private async instanceHosts(): Promise<string[]> {
    const instances = await this.instanceRepository.findAll()
    const hosts: string[] = []
    for (const instance of instances) {
      try {
        hosts.push(new URL(instance.baseUrl.value).hostname)
      } catch {
        // Malformed baseUrl shouldn't happen (validated at save time) — skip defensively.
      }
    }
    return hosts
  }
}
