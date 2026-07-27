import { useState } from 'react'
import { useCreateAdmin } from '#application/settings/create-admin.mutation'
import { Input } from '#presentation/ui/input'
import { Label } from '#presentation/ui/label'
import { Button } from '#presentation/ui/button'

export function AdminStep({ onNext }: { onNext: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const createAdmin = useCreateAdmin()

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    createAdmin.mutate({ email, password }, { onSuccess: (result) => result.ok && onNext() })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Create your admin account</h2>
        <p className="text-sm text-muted-foreground">
          This will be the only admin account for this instance.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="admin-email">Email</Label>
        <Input
          id="admin-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="admin-password">Password</Label>
        <Input
          id="admin-password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </div>
      {createAdmin.data && !createAdmin.data.ok ? (
        <p className="text-sm text-destructive">{createAdmin.data.error.message}</p>
      ) : null}
      <Button type="submit" disabled={createAdmin.isPending}>
        {createAdmin.isPending ? 'Creating…' : 'Continue'}
      </Button>
    </form>
  )
}
