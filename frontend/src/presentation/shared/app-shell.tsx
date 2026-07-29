import { useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useLocation, useNavigate } from '@tanstack/react-router'
import {
  Search,
  Settings,
  LogOut,
  Clapperboard,
  ListChecks,
  LibraryBig,
  CalendarDays,
  SlidersHorizontal,
} from 'lucide-react'
import { Button } from '#presentation/ui/button'
import { Badge } from '#presentation/ui/badge'
import { CommandPalette } from './command-palette'
import { useSession } from '#application/identity/session.query'
import { useSignOut } from '#application/identity/sign-out.mutation'
import { useQueryClient } from '@tanstack/react-query'
import { cn } from '#presentation/shared/utils'

const NAV_ITEMS = [
  { to: '/requests', label: 'Requests', icon: ListChecks },
  { to: '/library', label: 'Library', icon: LibraryBig },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
] as const

export function AppShell({ children }: { children: ReactNode }) {
  const [searchOpen, setSearchOpen] = useState(false)
  const session = useSession()
  const signOut = useSignOut()
  const queryClient = useQueryClient()
  const location = useLocation()
  const navigate = useNavigate()
  const isAdmin = session.data?.user?.role === 'admin'

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside className="flex h-full w-60 shrink-0 flex-col overflow-y-auto border-r bg-sidebar text-sidebar-foreground">
        <div className="flex items-center gap-2 px-4 py-4">
          <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Clapperboard className="size-4" />
          </div>
          <span className="display-title text-base font-semibold">arr</span>
        </div>

        <div className="px-3">
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2 text-muted-foreground"
            onClick={() => setSearchOpen(true)}
          >
            <Search className="size-4" />
            Search catalog
          </Button>
        </div>

        <nav className="mt-4 flex flex-1 flex-col gap-1 px-3">
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname.startsWith(item.to)
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                )}
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            )
          })}

          {isAdmin ? (
            <Link
              to="/profiles"
              className={cn(
                'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                location.pathname.startsWith('/profiles')
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
              )}
            >
              <SlidersHorizontal className="size-4" />
              Profiles
            </Link>
          ) : null}

          {isAdmin ? (
            <Link
              to="/settings"
              className={cn(
                'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                location.pathname.startsWith('/settings')
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
              )}
            >
              <Settings className="size-4" />
              Settings
            </Link>
          ) : null}
        </nav>

        <div className="border-t px-3 py-3">
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
      </aside>

      <main className="min-w-0 flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>

      <CommandPalette open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  )
}
