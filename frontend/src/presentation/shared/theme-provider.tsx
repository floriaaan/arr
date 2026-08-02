import { ThemeProvider as NextThemesProvider } from 'next-themes'
import type { ReactNode } from 'react'

export const THEME_STORAGE_KEY = 'arr-theme'

/**
 * `attribute="class"` because the whole stylesheet is built on it — the
 * `@custom-variant dark (&:is(.dark *))` in `styles.css` plus every `dark:`
 * utility in `presentation/ui/*`. Without this provider mounted, the entire
 * `.dark` block of `styles.css` is dead code and `useTheme()` (already used
 * by `ui/sonner.tsx`) never observes anything.
 *
 * `defaultTheme="system"` means the OS decides until the user picks
 * something explicitly; that explicit choice is persisted in localStorage,
 * which is deliberately per-device rather than per-account (cf.
 * docs/phase-5-quality-of-life, chantier 1 décision 3).
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      storageKey={THEME_STORAGE_KEY}
    >
      {children}
    </NextThemesProvider>
  )
}
