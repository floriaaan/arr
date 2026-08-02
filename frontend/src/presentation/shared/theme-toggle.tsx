import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { Monitor, Moon, Sun } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#presentation/ui/select'
import { cn } from '#presentation/shared/utils'

const OPTIONS = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
] as const

/**
 * Three states rather than a two-way switch: once a user has picked light or
 * dark explicitly, a toggle would give them no way back to "follow the OS"
 * (cf. docs/phase-5-quality-of-life, chantier 1 décision 6).
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // The server has no idea what the OS prefers, so the resolved value is only
  // knowable on the client — rendering it before mount would hydrate-mismatch.
  useEffect(() => setMounted(true), [])

  return (
    <Select value={mounted ? (theme ?? 'system') : 'system'} onValueChange={setTheme}>
      <SelectTrigger size="sm" className={cn('w-full', className)} aria-label="Theme">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            <option.icon className="size-4" />
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
