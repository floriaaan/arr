import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useLocation, useNavigate } from '@tanstack/react-router'
import {
  Search,
  Settings,
  LogOut,
  ListChecks,
  LibraryBig,
  CalendarDays,
  SlidersHorizontal,
  Download,
  Radar,
  Menu,
  UserCog,
} from 'lucide-react'
import { Button } from '#presentation/ui/button'
import { Badge } from '#presentation/ui/badge'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '#presentation/ui/sheet'
import { CommandPalette } from './command-palette'
import { ThemeToggle } from './theme-toggle'
import { useSession } from '#application/identity/session.query'
import { useSignOut } from '#application/identity/sign-out.mutation'
import { useQueryClient } from '@tanstack/react-query'
import { cn } from '#presentation/shared/utils'

const NAV_ITEMS = [
  { to: '/requests', label: 'Requests', icon: ListChecks },
  { to: '/library', label: 'Library', icon: LibraryBig },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/account', label: 'Account', icon: UserCog },
] as const

const ADMIN_NAV_ITEMS = [
  { to: '/profiles', label: 'Profiles', icon: SlidersHorizontal },
  { to: '/download-clients', label: 'Download Clients', icon: Download },
  { to: '/indexers', label: 'Indexers', icon: Radar },
  { to: '/settings', label: 'Settings', icon: Settings },
] as const

const NAV_LINK_CLASS =
  'flex items-center gap-2 rounded-none px-3 py-2 text-sm font-medium transition-colors'

export function AppShell({ children }: { children: ReactNode }) {
  const [searchOpen, setSearchOpen] = useState(false)
  const [navOpen, setNavOpen] = useState(false)
  const session = useSession()
  const signOut = useSignOut()
  const queryClient = useQueryClient()
  const location = useLocation()
  const navigate = useNavigate()
  const isAdmin = session.data?.user?.role === 'admin'

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'k' || !(event.metaKey || event.ctrlKey)) return
      // Let ⌘K through when the user is typing somewhere — some inputs and
      // rich editors bind it themselves.
      const target = event.target as HTMLElement | null
      if (target?.isContentEditable) return
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return

      event.preventDefault()
      setSearchOpen((open) => !open)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Navigating from the mobile drawer should close it.
  useEffect(() => setNavOpen(false), [location.pathname])

  const navItems = [...NAV_ITEMS, ...(isAdmin ? ADMIN_NAV_ITEMS : [])]

  const sidebar = (
    <>
      <div className="flex items-center gap-2 px-4 py-4">
        <img src="/logo.svg" alt="" className="size-7 rounded-none" />
        <span className="display-title text-base font-semibold">arr</span>
      </div>

      <div className="px-3">
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2 text-muted-foreground"
          onClick={() => {
            setNavOpen(false)
            setSearchOpen(true)
          }}
        >
          <Search className="size-4" />
          Search catalog
          <kbd className="ml-auto hidden rounded-none border bg-muted px-1.5 py-0.5 font-sans text-[10px] font-medium text-muted-foreground sm:inline">
            ⌘K
          </kbd>
        </Button>
      </div>

      <nav className="mt-4 flex flex-1 flex-col gap-1 px-3">
        {navItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              NAV_LINK_CLASS,
              location.pathname.startsWith(item.to)
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
            )}
          >
            <item.icon className="size-4" />
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="space-y-3 border-t px-3 py-3">
        <ThemeToggle />
        <div className="flex items-center justify-between gap-2 px-1">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{session.data?.user?.email}</p>
            {session.data?.user ? (
              <Badge variant="outline" className="mt-1 text-[10px] capitalize">
                {session.data.user.role}
              </Badge>
            ) : null}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() =>
              signOut.mutate(undefined, {
                onSuccess: () => {
                  queryClient.clear()
                  void navigate({ to: '/login' })
                },
              })
            }
          >
            <LogOut className="size-4" />
          </Button>
        </div>
      </div>
    </>
  )

  return (
    // `h-dvh`, not `h-screen`: on mobile browsers `vh` ignores the collapsing
    // address bar, which clipped the bottom of the layout.
    <div className="flex h-dvh overflow-hidden bg-background">
      {/* The same sidebar twice: a fixed column from `md` up, a drawer below.
          Rendering one and repositioning it with CSS would mean the drawer
          keeps a focus trap it shouldn't have on desktop. */}
      <aside className="hidden h-full w-60 shrink-0 flex-col overflow-y-auto border-r bg-sidebar text-sidebar-foreground md:flex">
        {sidebar}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-2 border-b px-3 py-2 md:hidden">
          <Sheet open={navOpen} onOpenChange={setNavOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open navigation">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="overflow-y-auto">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              {sidebar}
            </SheetContent>
          </Sheet>
          <img src="/logo.svg" alt="" className="size-6 rounded-none" />
          <span className="display-title text-base font-semibold">arr</span>
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto"
            aria-label="Search catalog"
            onClick={() => setSearchOpen(true)}
          >
            <Search className="size-5" />
          </Button>
        </header>

        <main className="min-w-0 flex-1 overflow-y-auto p-4 md:p-6">
          <div className="mx-auto max-w-5xl">{children}</div>
        </main>
      </div>

      <CommandPalette open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  )
}
