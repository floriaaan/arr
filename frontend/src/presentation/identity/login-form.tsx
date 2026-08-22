import { useState } from 'react'
import { toast } from 'sonner'
import { useSignIn } from '#application/identity/sign-in.mutation'
import { useStartOidcSignIn } from '#application/identity/start-oidc-sign-in.mutation'
import { useEffectiveAuthSettings } from '#application/settings/auth-settings.query'
import { Button } from '#presentation/ui/button'
import { Input } from '#presentation/ui/input'
import { Label } from '#presentation/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '#presentation/ui/card'

export function LoginForm({ onSignedIn }: { onSignedIn: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const signIn = useSignIn()
  const startOidcSignIn = useStartOidcSignIn()
  const authSettings = useEffectiveAuthSettings()

  function handleOidcSignIn() {
    // Absolute, not '/': better-auth resolves a relative callbackURL
    // against its own `baseURL` (the backend's origin, cf. instance.ts),
    // which has no page to serve — it'd bounce the browser to a bare
    // AdonisJS 404 instead of back to this (frontend) app.
    startOidcSignIn.mutate(`${window.location.origin}/`, {
      onSuccess: (result) => {
        if (result.ok) window.location.href = result.value.url
        else toast.error(result.error.message)
      },
    })
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    signIn.mutate({ email, password }, { onSuccess: (result) => result.ok && onSignedIn() })
  }

  return (
    <div className="grid-backdrop flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {authSettings.data?.passwordLoginEnabled !== false ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </div>
              {signIn.data && !signIn.data.ok ? (
                <p className="text-sm text-destructive">{signIn.data.error.message}</p>
              ) : null}
              <Button type="submit" className="w-full" disabled={signIn.isPending}>
                {signIn.isPending ? 'Signing in…' : 'Sign in'}
              </Button>
            </form>
          ) : null}

          {authSettings.data?.oidcConfigured ? (
            <Button
              variant="outline"
              className="w-full"
              onClick={handleOidcSignIn}
              disabled={startOidcSignIn.isPending}
            >
              Sign in with PocketID
            </Button>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
