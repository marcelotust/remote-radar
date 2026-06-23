import { describe, it, expect } from 'vitest'
import { formatLastRun } from './formatLastRun'
import type { ScrapingSource } from '../../types'

const base: ScrapingSource = {
  id: 's1',
  label: 'WWR',
  url: 'https://weworkremotely.com',
  is_active: true,
  created_at: '2026-06-01T00:00:00Z',
}

describe('formatLastRun', () => {
  it('shows a muted "nunca" when there is no run', () => {
    expect(formatLastRun(base)).toEqual({ text: 'Última run: nunca', tone: 'muted' })
  })

  it('shows a pt-BR date, the job count, and a check on success', () => {
    const r = formatLastRun({
      ...base,
      last_run_at: '2026-06-22T09:00:00Z',
      last_run_status: 'success',
      last_run_jobs_added: 4,
    })
    expect(r.tone).toBe('ok')
    expect(r.text).toMatch(/^Última run: \d{2}\/\d{2}\/\d{4} \d{2}:\d{2} · 4 vagas novas · ✅$/)
  })

  it('uses the singular "1 vaga nova"', () => {
    const r = formatLastRun({
      ...base,
      last_run_at: '2026-06-22T09:00:00Z',
      last_run_status: 'success',
      last_run_jobs_added: 1,
    })
    expect(r.text).toContain('· 1 vaga nova ·')
  })

  it('shows "falhou" with the error in the title on error', () => {
    const r = formatLastRun({
      ...base,
      last_run_at: '2026-06-22T09:00:00Z',
      last_run_status: 'error',
      last_run_error: 'render timeout',
    })
    expect(r.tone).toBe('error')
    expect(r.text).toMatch(/^Última run: \d{2}\/\d{2}\/\d{4} \d{2}:\d{2} · falhou ⚠️$/)
    expect(r.title).toBe('render timeout')
  })
})
