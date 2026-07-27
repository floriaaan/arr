/**
 * `task dev:fake` runs fully offline (no backend, no network) — a poster
 * pointing at a real image URL would defeat that. Generates a deterministic
 * SVG data URI instead: same title always gets the same color + initials.
 */
export function placeholderPoster(title: string, hue: number): string {
  const initials = title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('')

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="450">
    <rect width="300" height="450" fill="hsl(${hue}, 45%, 30%)" />
    <text x="150" y="225" font-size="72" fill="white" font-family="sans-serif" text-anchor="middle" dominant-baseline="middle">${initials}</text>
  </svg>`

  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}
