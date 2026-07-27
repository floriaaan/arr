import { useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { Search, Settings, LogOut } from 'lucide-react'
import { Button } from '#presentation/ui/button'
import { CommandPalette } from './command-palette'
import { useSession } from '#application/identity/session.query'
import { useSignOut } from '#application/identity/sign-out.mutation'
import { useQueryClient } from '@tanstack/react-query'

export function AppShell({ children }: { children: ReactNode }) {
  const [searchOpen, setSearchOpen] = useState(false)
  const session = useSession()
  const signOut = useSignOut()
  const queryClient = useQueryClient()

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <Link to="/requests" className="text-sm font-semibold">
          arr
        </Link>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setSearchOpen(true)}>
            <Search className="size-4" />
            Search
          </Button>
          {session.data?.user?.role === 'admin' ? (
            <Button variant="ghost" size="icon" asChild>
              <Link to="/settings">
                <Settings className="size-4" />
              </Link>
            </Button>
          ) : null}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => signOut.mutate(undefined, { onSuccess: () => queryClient.clear() })}
          >
            <LogOut className="size-4" />
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl p-4">{children}</main>
      <CommandPalette open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  )
}
