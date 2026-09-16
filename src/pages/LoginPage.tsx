import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

type Status = 'idle' | 'not-allowed' | 'error'

const NOT_ALLOWED_MESSAGE =
  'Esse e-mail ainda não foi liberado. Peça para o administrador te adicionar.'

/**
 * Google's redirect back from a rejected `before-user-created` hook (or any
 * OAuth failure) lands here with `error`/`error_description` in the hash or
 * query string instead of a session. Surface it, then scrub the URL so a
 * refresh doesn't re-show it.
 */
const readOAuthError = (): string | null => {
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const query = new URLSearchParams(window.location.search)
  const description = hash.get('error_description') ?? query.get('error_description')
  if (!description) return null

  window.history.replaceState(null, '', window.location.pathname)
  return description.replace(/\+/g, ' ')
}

export const LoginPage = () => {
  const { session, loading } = useAuth()
  const [status, setStatus] = useState<Status>('idle')

  useEffect(() => {
    const description = readOAuthError()
    if (!description) return
    setStatus(description === NOT_ALLOWED_MESSAGE ? 'not-allowed' : 'error')
  }, [])

  if (!loading && session) return <Navigate to="/" replace />

  const handleGoogleSignIn = () => {
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
  }

  return (
    <main className="min-h-screen bg-brand-bg flex items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-3xl border-2 border-brand-green/20 bg-brand-surface p-6 flex flex-col gap-4">
        <h1 className="text-white font-bold text-lg">Remote Radar</h1>

        <p className="text-sm text-gray-400">Entre com sua conta Google para continuar.</p>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          className="rounded-xl border border-brand-gray/30 bg-brand-bg px-4 py-2 text-sm font-medium text-white hover:border-brand-green/60"
        >
          Continuar com Google
        </button>

        {status === 'not-allowed' && <p className="text-sm text-red-400">{NOT_ALLOWED_MESSAGE}</p>}
        {status === 'error' && (
          <p className="text-sm text-red-400">Não foi possível entrar agora. Tente novamente.</p>
        )}
      </div>
    </main>
  )
}
