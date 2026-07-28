export function formatSize(bytes: number): string {
  if (bytes <= 0) return '—'
  const tb = bytes / 1_000_000_000_000
  if (tb >= 1) return `${tb.toFixed(1)} TB`
  const gb = bytes / 1_000_000_000
  return gb >= 1 ? `${gb.toFixed(1)} GB` : `${(bytes / 1_000_000).toFixed(0)} MB`
}
