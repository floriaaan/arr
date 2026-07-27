/** Backend's `posterRef` is an opaque signed token, not a URL — cf. docs/phase-5 decision 2. */
export function toPosterUrl(posterRef: string | null): string | null {
  return posterRef ? `/api/images?ref=${encodeURIComponent(posterRef)}` : null
}
