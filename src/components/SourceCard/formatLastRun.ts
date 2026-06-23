import type { ScrapingSource } from '../../types'

export interface LastRunDisplay {
  text: string
  tone: 'muted' | 'ok' | 'error'
  title?: string
}

const dateFmt = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' })

export const formatLastRun = (source: ScrapingSource): LastRunDisplay => {
  if (!source.last_run_at) {
    return { text: 'Última run: nunca', tone: 'muted' }
  }
  const when = dateFmt.format(new Date(source.last_run_at)).replace(', ', ' ')
  if (source.last_run_status === 'error') {
    return {
      text: `Última run: ${when} · falhou ⚠️`,
      tone: 'error',
      title: source.last_run_error ?? undefined,
    }
  }
  const n = source.last_run_jobs_added ?? 0
  const count = n === 1 ? '1 vaga nova' : `${n} vagas novas`
  return { text: `Última run: ${when} · ${count} · ✅`, tone: 'ok' }
}
