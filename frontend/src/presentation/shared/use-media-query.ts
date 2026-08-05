import { useEffect, useState } from 'react'

/**
 * `matchMedia` doesn't exist during SSR, so this always starts `false` and
 * syncs to the real value on mount (a one-frame flash of the "desktop"
 * layout on a fresh mobile load, never the reverse — cf. `SettingsPanels`,
 * whose only consumer needs a JS-driven value because Radix `Tabs`'
 * `orientation` prop can't be made responsive with CSS alone).
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const mediaQueryList = window.matchMedia(query)
    setMatches(mediaQueryList.matches)

    const listener = (event: MediaQueryListEvent) => setMatches(event.matches)
    mediaQueryList.addEventListener('change', listener)
    return () => mediaQueryList.removeEventListener('change', listener)
  }, [query])

  return matches
}
