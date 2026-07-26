import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile, stat } from 'node:fs/promises'
import path from 'node:path'

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000

export interface CachedImage {
  buffer: Buffer
  contentType: string
}

function cacheKeyFor(remoteUrl: string): string {
  return createHash('sha256').update(remoteUrl).digest('hex')
}

/** Keyed by the remote URL (not the signed ref), so two refs pointing at the same image share a cache entry. */
export class DiskImageCache {
  constructor(private readonly cacheDir: string) {}

  async get(remoteUrl: string): Promise<CachedImage | null> {
    const key = cacheKeyFor(remoteUrl)
    const dataPath = path.join(this.cacheDir, `${key}.bin`)
    const metaPath = path.join(this.cacheDir, `${key}.json`)

    try {
      const stats = await stat(dataPath)
      if (Date.now() - stats.mtimeMs > CACHE_TTL_MS) return null

      const [buffer, metaRaw] = await Promise.all([readFile(dataPath), readFile(metaPath, 'utf-8')])
      const meta = JSON.parse(metaRaw) as { contentType: string }
      return { buffer, contentType: meta.contentType }
    } catch {
      return null
    }
  }

  async set(remoteUrl: string, image: CachedImage): Promise<void> {
    const key = cacheKeyFor(remoteUrl)
    await mkdir(this.cacheDir, { recursive: true })
    await Promise.all([
      writeFile(path.join(this.cacheDir, `${key}.bin`), image.buffer),
      writeFile(
        path.join(this.cacheDir, `${key}.json`),
        JSON.stringify({ contentType: image.contentType }),
      ),
    ])
  }
}
