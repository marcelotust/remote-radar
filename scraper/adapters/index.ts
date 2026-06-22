import type { Adapter } from './types.ts'
import { generic } from './generic.ts'
import { weworkremotely } from './weworkremotely.ts'

const adapters: Adapter[] = [weworkremotely]

export const resolveAdapter = (sourceUrl: string): Adapter => {
  let host = ''
  try {
    host = new URL(sourceUrl).hostname.replace(/^www\./, '')
  } catch {
    return generic
  }
  return adapters.find((a) => host === a.host || host.endsWith(`.${a.host}`)) ?? generic
}
