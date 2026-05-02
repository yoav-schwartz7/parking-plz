import { useState } from 'react'
import { login } from '../api'
import { getToken, setToken } from '../auth'

interface AuthGateProps {
  children: React.ReactNode
}

export function AuthGate({ children }: AuthGateProps) {
  const [authenticated, setAuthenticated] = useState<boolean>(() => getToken() !== null)
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const token = await login(password)
      setToken(token)
      setAuthenticated(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not reach the server. Try again.')
    } finally {
      setLoading(false)
    }
  }

  if (authenticated) return <>{children}</>

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <img src="/parking-plz-animated.gif" alt="Parking PLZ" className="mx-auto mb-3 h-16 w-16 object-contain drop-shadow" />
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Parking PLZ</h1>
          <p className="mt-1 text-sm text-gray-500">Enter your password to continue</p>
        </div>

        <div className="rounded-2xl border border-white/80 bg-white/90 p-6 shadow-lg backdrop-blur-sm">
          <form onSubmit={handleLogin} className="flex flex-col gap-3">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              disabled={loading}
              autoFocus
              className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 transition focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={loading || !password}
              className="rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 active:scale-95 disabled:opacity-40"
            >
              {loading ? 'Signing in...' : 'Enter'}
            </button>
            {error && (
              <p className="text-center text-xs text-red-500">{error}</p>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}
