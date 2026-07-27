/** `YYYY-MM-DD` — the `start`/`end` query format Radarr/Sonarr/Lidarr's calendar endpoints expect. */
export function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}
