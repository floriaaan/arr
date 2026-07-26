/** Known poster/artwork hosts. *arr instance hosts are added dynamically by ImageProxyService. */
const ALLOWED_HOSTS = new Set(['image.tmdb.org', 'assets.fanart.tv', 'artworks.thetvdb.com'])

export function isAllowedImageHost(
  remoteUrl: string,
  extraAllowedHosts: readonly string[] = [],
): boolean {
  let hostname: string
  try {
    hostname = new URL(remoteUrl).hostname
  } catch {
    return false
  }
  return ALLOWED_HOSTS.has(hostname) || extraAllowedHosts.includes(hostname)
}
