const MS_PER_DAY = 86_400_000

const startOfDay = (d: Date): number =>
  Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())

export const relativeDate = (iso: string, now: Date = new Date()): string => {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return 'hoje'

  const d = Math.round((startOfDay(now) - startOfDay(new Date(then))) / MS_PER_DAY)

  if (d <= 0) return 'hoje'
  if (d === 1) return 'ontem'
  if (d <= 6) return `há ${d} dias`
  if (d <= 13) return 'semana passada'
  if (d <= 29) return `há ${Math.floor(d / 7)} semanas`
  const months = Math.floor(d / 30)
  return months === 1 ? 'há 1 mês' : `há ${months} meses`
}
