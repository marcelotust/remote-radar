import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

type Status = 'idle' | 'sending' | 'sent' | 'not-allowed' | 'error'

export const LoginPage = () => {
  const { session, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>('idle')

  if (!loading && session) return <Navigate to="/" replace />

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setStatus('sending')

    const { data: allowed, error: rpcError } = await supabase.rpc('is_email_allowed', {
      check_email: email,
    })
    if (rpcError) {
      setStatus('error')
      return
    }
    if (!allowed) {
      setStatus('not-allowed')
      return
    }

    const { error } = await supabase.auth.signInWithOtp({ email })
    setStatus(error ? 'error' : 'sent')
  }

  return (
    <main className="min-h-screen bg-brand-bg flex items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-3xl border-2 border-brand-green/20 bg-brand-surface p-6 flex flex-col gap-4"
      >
        <h1 className="text-white font-bold text-lg">Remote Radar</h1>
        <p className="text-sm text-gray-400">
          Digite seu e-mail para receber um link de acesso — sem senha.
        </p>

        <label className="flex flex-col gap-1 text-sm text-gray-300" htmlFor="login-email">
          E-mail
          <input
            id="login-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-xl border border-brand-gray/30 bg-brand-bg px-3 py-2 text-white"
            placeholder="voce@example.com"
          />
        </label>

        <button
          type="submit"
          disabled={status === 'sending'}
          className="rounded-xl bg-brand-green px-4 py-2 font-semibold text-brand-bg disabled:opacity-60"
        >
          Enviar link de acesso
        </button>

        {status === 'sent' && (
          <p className="text-sm text-brand-green">Verifique seu e-mail para o link de acesso.</p>
        )}
        {status === 'not-allowed' && (
          <p className="text-sm text-red-400">
            Esse e-mail ainda não foi liberado. Peça para o administrador te adicionar.
          </p>
        )}
        {status === 'error' && (
          <p className="text-sm text-red-400">
            Não foi possível enviar o link agora. Tente novamente.
          </p>
        )}
      </form>
    </main>
  )
}
