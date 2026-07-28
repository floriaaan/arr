import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2, Shield, ShieldOff } from 'lucide-react'
import { useUsers } from '#application/identity/users.query'
import { useSetUserRole } from '#application/identity/set-user-role.mutation'
import { useSession } from '#application/identity/session.query'
import { Card, CardContent } from '#presentation/ui/card'
import { Button } from '#presentation/ui/button'
import { Badge } from '#presentation/ui/badge'
import type { UserAccount } from '#domain/identity/user-account'

function UserRow({ user, isSelf }: { user: UserAccount; isSelf: boolean }) {
  const queryClient = useQueryClient()
  const setUserRole = useSetUserRole()
  const nextRole = user.role === 'admin' ? 'user' : 'admin'

  function toggleRole() {
    setUserRole.mutate(
      { userId: user.id, role: nextRole },
      {
        onSuccess: (result) => {
          if (!result.ok) return toast.error(result.error.message)
          toast.success(`${user.email} is now ${nextRole}.`)
          void queryClient.invalidateQueries({ queryKey: ['users'] })
        },
      },
    )
  }

  return (
    <div className="flex items-center gap-4 px-6 py-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium">{user.name || user.email}</p>
          <Badge variant={user.role === 'admin' ? 'default' : 'outline'} className="capitalize">
            {user.role}
          </Badge>
          {isSelf ? <Badge variant="secondary">You</Badge> : null}
        </div>
        <p className="truncate text-xs text-muted-foreground">{user.email}</p>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={toggleRole}
        disabled={isSelf || setUserRole.isPending}
        title={isSelf ? "You can't change your own role." : undefined}
      >
        {setUserRole.isPending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : nextRole === 'admin' ? (
          <Shield className="size-4" />
        ) : (
          <ShieldOff className="size-4" />
        )}
        {nextRole === 'admin' ? 'Make admin' : 'Revoke admin'}
      </Button>
    </div>
  )
}

export function UsersPanel() {
  const users = useUsers()
  const session = useSession()

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Users</h2>
        <p className="text-sm text-muted-foreground">
          Everyone who has signed in, whether through a password or SSO. Promote a user to admin
          to let them manage services and settings.
        </p>
      </div>
      <Card className="py-0">
        <CardContent className="divide-y px-0">
          {users.data?.map((user) => (
            <UserRow key={user.id} user={user} isSelf={user.id === session.data?.user?.id} />
          ))}
          {users.data?.length === 0 ? (
            <p className="px-6 py-4 text-sm text-muted-foreground">No users yet.</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
