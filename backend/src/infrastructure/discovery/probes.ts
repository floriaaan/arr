import { z } from 'zod'
import type { DiscoveredInstance } from '#domain/settings/discovered-instance.vo'
import type { Candidate } from './candidates.js'

const HTTP_TIMEOUT_MS = 1_500

const publicSystemInfoSchema = z.object({
  Id: z.string().optional(),
  ServerName: z.string().optional(),
  Version: z.string().optional(),
  ProductName: z.string().optional(),
})

async function get(url: string): Promise<Response | null> {
  try {
    return await fetch(url, {
      headers: { Accept: 'application/json,text/html' },
      signal: AbortSignal.timeout(HTTP_TIMEOUT_MS),
    })
  } catch {
    return null
  }
}

/**
 * `/ping` proves we're talking to an *arr, but not *which* one — every one of
 * the three answers the same `{"status":"OK"}`. The login page's `<title>`
 * settles it without any credential. Deliberately never touches
 * `/initialize.js`, which would also hand over the instance's API key
 * (cf. docs/phase-5-quality-of-life/01, décision 6).
 */
async function probeServarr(
  baseUrl: string,
  candidate: Candidate,
): Promise<DiscoveredInstance | null> {
  const ping = await get(`${baseUrl}/ping`)
  if (!ping?.ok) return null

  const body = await ping.text().catch(() => '')
  if (!body.toLowerCase().includes('ok')) return null

  const root = await get(`${baseUrl}/`)
  const html = root?.ok ? await root.text().catch(() => '') : ''
  const title = /<title>([^<]*)<\/title>/i.exec(html)?.[1]?.trim().toLowerCase() ?? ''

  for (const kind of ['radarr', 'sonarr', 'lidarr'] as const) {
    if (title.includes(kind)) {
      return {
        kind,
        baseUrl,
        // Version lives behind `/api/v3/system/status`, which needs the API
        // key the user hasn't given us yet.
        detectedVersion: null,
        serverName: null,
        confidence: 'confirmed',
      }
    }
  }

  return {
    kind: candidate.expectedKind,
    baseUrl,
    detectedVersion: null,
    serverName: null,
    confidence: 'port',
  }
}

/** `/identity` is the one Plex endpoint that answers without a token. */
async function probePlex(baseUrl: string): Promise<DiscoveredInstance | null> {
  const response = await get(`${baseUrl}/identity`)
  if (!response?.ok) return null

  const body = await response.text().catch(() => '')
  if (!body.includes('MediaContainer')) return null

  return {
    kind: 'plex',
    baseUrl,
    detectedVersion: /version="([^"]+)"/.exec(body)?.[1] ?? null,
    serverName: null,
    confidence: 'confirmed',
  }
}

/**
 * Jellyfin and Emby share this route (Jellyfin forked it) and port 8096, so
 * `ProductName` is the only separator. Jellyfin has sent it since 10.x; a
 * server that omits it is taken for Emby.
 */
async function probeJellyfinOrEmby(baseUrl: string): Promise<DiscoveredInstance | null> {
  const response = await get(`${baseUrl}/System/Info/Public`)
  if (!response?.ok) return null

  const parsed = publicSystemInfoSchema.safeParse(await response.json().catch(() => null))
  if (!parsed.success) return null

  const productName = parsed.data.ProductName?.toLowerCase() ?? ''
  const isJellyfin = productName.includes('jellyfin')

  return {
    kind: isJellyfin ? 'jellyfin' : 'emby',
    baseUrl,
    detectedVersion: parsed.data.Version ?? null,
    serverName: parsed.data.ServerName ?? null,
    confidence: productName === '' ? 'port' : 'confirmed',
  }
}

export async function probe(candidate: Candidate): Promise<DiscoveredInstance | null> {
  const baseUrl = `http://${candidate.host}:${candidate.port}`

  switch (candidate.family) {
    case 'servarr':
      return probeServarr(baseUrl, candidate)
    case 'plex':
      return probePlex(baseUrl)
    case 'jellyfin-emby':
      return probeJellyfinOrEmby(baseUrl)
  }
}
